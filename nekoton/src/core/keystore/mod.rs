use std::sync::Arc;
use std::time::Duration;

use serde::Deserialize;
use sha2::Digest;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use crate::utils::*;

#[wasm_bindgen]
pub struct KeyStore {
    #[wasm_bindgen(skip)]
    pub inner: Arc<nt::core::keystore::KeyStore>,
}

#[wasm_bindgen]
impl KeyStore {
    #[wasm_bindgen]
    pub fn verify(data: &str) -> bool {
        struct StubLedgerConnection;

        #[async_trait::async_trait]
        impl nt::external::LedgerConnection for StubLedgerConnection {
            async fn get_public_key(
                &self,
                _: u16,
            ) -> anyhow::Result<[u8; ed25519_dalek::PUBLIC_KEY_LENGTH]> {
                unreachable!()
            }

            async fn sign(
                &self,
                _: u16,
                _: &[u8],
                _: &Option<nt::external::LedgerSignatureContext>,
            ) -> anyhow::Result<[u8; ed25519_dalek::SIGNATURE_LENGTH]> {
                unreachable!()
            }
        }

        fn try_verify(data: &str) -> anyhow::Result<()> {
            nt::core::keystore::KeyStore::builder()
                .with_signer(DERIVED_SIGNER, nt::crypto::DerivedKeySigner::new())?
                .with_signer(ENCRYPTED_SIGNER, nt::crypto::EncryptedKeySigner::new())?
                .with_signer(
                    LEDGER_SIGNER,
                    nt::crypto::LedgerKeySigner::new(Arc::new(StubLedgerConnection)),
                )?
                .verify(data)
        }

        try_verify(data).is_ok()
    }

    #[wasm_bindgen]
    pub fn load(
        storage: &crate::external::Storage,
        ledger_connection: &crate::external::LedgerConnection,
    ) -> PromiseKeyStore {
        let storage = storage.inner.clone();
        let ledger_connection = ledger_connection.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let inner = Arc::new(
                nt::core::keystore::KeyStore::builder()
                    .with_signer(DERIVED_SIGNER, nt::crypto::DerivedKeySigner::new())
                    .handle_error()?
                    .with_signer(ENCRYPTED_SIGNER, nt::crypto::EncryptedKeySigner::new())
                    .handle_error()?
                    .with_signer(
                        LEDGER_SIGNER,
                        nt::crypto::LedgerKeySigner::new(ledger_connection),
                    )
                    .handle_error()?
                    .load(storage as Arc<dyn nt::external::Storage>)
                    .await
                    .handle_error()?,
            );

            Ok(JsValue::from(Self { inner }))
        }))
    }

    #[wasm_bindgen]
    pub fn reload(&self) -> PromiseVoid {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            inner.reload().await.handle_error()?;
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(js_name = "refreshPasswordCache")]
    pub fn refresh_password_cache(&self) {
        self.inner.password_cache().refresh();
    }

    #[wasm_bindgen(js_name = "isPasswordCached")]
    pub fn is_password_cached(&self, public_key: &str) -> Result<bool, JsValue> {
        let public_key = parse_public_key(public_key)?;
        Ok(self
            .inner
            .is_password_cached(public_key.as_bytes(), KEYSTORE_CACHE_GAP))
    }

    #[wasm_bindgen(js_name = "addKey")]
    pub fn add_key(&self, new_key: JsNewKey) -> Result<PromiseKeyStoreEntry, JsValue> {
        use nt::crypto::*;

        let inner = self.inner.clone();
        let new_key = JsValue::into_serde::<ParsedNewKey>(&new_key).handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let entry = match new_key {
                ParsedNewKey::MasterKey {
                    name,
                    params,
                    password,
                } => {
                    inner
                        .add_key::<DerivedKeySigner>(match params {
                            ParsedNewMasterKeyParams::MasterKeyParams { phrase } => {
                                DerivedKeyCreateInput::Import {
                                    key_name: name,
                                    phrase: phrase.into(),
                                    password: explicit_password(password),
                                }
                            }
                            ParsedNewMasterKeyParams::DerivedKeyParams {
                                master_key,
                                account_id,
                            } => DerivedKeyCreateInput::Derive {
                                key_name: name,
                                master_key: parse_public_key(&master_key)?,
                                account_id,
                                password: explicit_password(password),
                            },
                        })
                        .await
                }
                ParsedNewKey::EncryptedKey {
                    name,
                    phrase,
                    mnemonic_type,
                    password,
                } => {
                    inner
                        .add_key::<EncryptedKeySigner>(EncryptedKeyCreateInput {
                            name,
                            phrase: phrase.into(),
                            mnemonic_type: mnemonic_type.into(),
                            password: explicit_password(password),
                        })
                        .await
                }
                ParsedNewKey::LedgerKey { name, account_id } => {
                    inner
                        .add_key::<LedgerKeySigner>(LedgerKeyCreateInput { name, account_id })
                        .await
                }
            }
            .handle_error()?;

            Ok(JsValue::from(make_key_store_entry(entry)))
        })))
    }

    #[wasm_bindgen(js_name = "renameKey")]
    pub fn rename_key(&self, rename: JsRenameKey) -> Result<PromiseKeyStoreEntry, JsValue> {
        use nt::crypto::*;

        let inner = self.inner.clone();
        let rename = JsValue::into_serde::<ParsedRenameKey>(&rename).handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let entry = match rename {
                ParsedRenameKey::MasterKey {
                    master_key,
                    public_key,
                    name,
                } => {
                    let input = DerivedKeyUpdateParams::RenameKey {
                        master_key: parse_public_key(&master_key)?,
                        public_key: parse_public_key(&public_key)?,
                        name,
                    };
                    inner.update_key::<DerivedKeySigner>(input).await
                }
                ParsedRenameKey::EncryptedKey { public_key, name } => {
                    let input = EncryptedKeyUpdateParams::Rename {
                        public_key: parse_public_key(&public_key)?,
                        name,
                    };
                    inner.update_key::<EncryptedKeySigner>(input).await
                }
                ParsedRenameKey::LedgerKey { public_key, name } => {
                    let input = LedgerUpdateKeyInput::Rename {
                        public_key: parse_public_key(&public_key)?,
                        name,
                    };
                    inner.update_key::<LedgerKeySigner>(input).await
                }
            }
            .handle_error()?;

            Ok(make_key_store_entry(entry).unchecked_into())
        })))
    }

    #[wasm_bindgen(js_name = "changeKeyPassword")]
    pub fn change_key_password(
        &self,
        change_password: JsChangeKeyPassword,
    ) -> Result<PromiseKeyStoreEntry, JsValue> {
        use nt::crypto::*;

        let inner = self.inner.clone();
        let change_password =
            JsValue::into_serde::<ParsedChangeKeyPassword>(&change_password).handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let entry = match change_password {
                ParsedChangeKeyPassword::MasterKey {
                    master_key,
                    old_password,
                    new_password,
                } => {
                    let input = DerivedKeyUpdateParams::ChangePassword {
                        master_key: parse_public_key(&master_key)?,
                        old_password: explicit_password(old_password),
                        new_password: explicit_password(new_password),
                    };
                    inner.update_key::<DerivedKeySigner>(input).await
                }
                ParsedChangeKeyPassword::EncryptedKey {
                    public_key,
                    old_password,
                    new_password,
                } => {
                    let public_key = parse_public_key(&public_key)?;
                    let input = EncryptedKeyUpdateParams::ChangePassword {
                        public_key,
                        old_password: explicit_password(old_password),
                        new_password: explicit_password(new_password),
                    };
                    inner.update_key::<EncryptedKeySigner>(input).await
                }
            }
            .handle_error()?;

            Ok(make_key_store_entry(entry).unchecked_into())
        })))
    }

    #[wasm_bindgen(js_name = "exportKey")]
    pub fn export_key(&self, export_key: JsExportKey) -> Result<PromiseExportedKey, JsValue> {
        use nt::crypto::*;

        let inner = self.inner.clone();
        let export_key = JsValue::into_serde::<ParsedExportKey>(&export_key).handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let output = match export_key {
                ParsedExportKey::MasterKey {
                    master_key,
                    password,
                } => {
                    let input = DerivedKeyExportParams {
                        master_key: parse_public_key(&master_key)?,
                        password: explicit_password(password),
                    };
                    inner
                        .export_key::<DerivedKeySigner>(input)
                        .await
                        .map(make_exported_master_key)
                }
                ParsedExportKey::EncryptedKey {
                    public_key,
                    password,
                } => {
                    let public_key = parse_public_key(&public_key)?;
                    let input = EncryptedKeyPassword {
                        public_key,
                        password: explicit_password(password),
                    };
                    inner
                        .export_key::<EncryptedKeySigner>(input)
                        .await
                        .map(make_exported_encrypted_key)
                }
            }
            .handle_error()?;

            Ok(JsValue::from(output))
        })))
    }

    #[wasm_bindgen(js_name = "getPublicKeys")]
    pub fn get_public_keys(
        &self,
        get_public_keys: JsGetPublicKeys,
    ) -> Result<PromisePublicKeys, JsValue> {
        use nt::crypto::*;

        let inner = self.inner.clone();
        let get_public_keys =
            JsValue::into_serde::<ParsedGetPublicKeys>(&get_public_keys).handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            match get_public_keys {
                ParsedGetPublicKeys::MasterKey {
                    master_key,
                    password,
                    cache,
                    offset,
                    limit,
                } => {
                    let input = DerivedKeyGetPublicKeys {
                        master_key: parse_public_key(&master_key)?,
                        password: cached_password(password, cache),
                        limit,
                        offset,
                    };
                    inner
                        .get_public_keys::<DerivedKeySigner>(input)
                        .await
                        .map(make_public_keys_list)
                }
                ParsedGetPublicKeys::LedgerKey { offset, limit } => {
                    let input = LedgerKeyGetPublicKeys { offset, limit };
                    inner
                        .get_public_keys::<LedgerKeySigner>(input)
                        .await
                        .map(make_public_keys_list)
                }
            }
            .handle_error()
        })))
    }

    #[wasm_bindgen]
    pub fn check_password(&self, key_password: JsKeyPassword) -> Result<PromiseBool, JsValue> {
        let inner = self.inner.clone();
        let key_password =
            JsValue::into_serde::<ParsedKeyPassword>(&key_password).handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let hash = ton_types::UInt256::default();
            Ok(JsValue::from(
                sign_data(&inner, key_password, hash.as_slice())
                    .await
                    .is_ok(),
            ))
        })))
    }

    #[wasm_bindgen(js_name = "encryptData")]
    pub fn encrypt_data(
        &self,
        data: &str,
        public_keys: PublicKeysList,
        algorithm: &str,
        key_password: JsKeyPassword,
    ) -> Result<PromiseEncryptedData, JsValue> {
        use std::str::FromStr;

        let inner = self.inner.clone();
        let data = base64::decode(data).handle_error()?;
        let public_keys = parse_public_key_list(public_keys)?;
        let algorithm = nt::crypto::EncryptionAlgorithm::from_str(algorithm).handle_error()?;
        let key_password =
            JsValue::into_serde::<ParsedKeyPassword>(&key_password).handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            Ok(
                encrypt_data(&inner, &data, key_password, &public_keys, algorithm)
                    .await?
                    .into_iter()
                    .map(|data| make_encrypted_data(data).unchecked_into::<JsValue>())
                    .collect::<js_sys::Array>()
                    .unchecked_into(),
            )
        })))
    }

    #[wasm_bindgen(js_name = "decryptData")]
    pub fn decrypt_data(
        &self,
        data: EncryptedData,
        key_password: JsKeyPassword,
    ) -> Result<PromiseString, JsValue> {
        let inner = self.inner.clone();
        let data = parse_encrypted_data(data)?;
        let key_password =
            JsValue::into_serde::<ParsedKeyPassword>(&key_password).handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let data = decrypt_data(&inner, data, key_password).await?;
            Ok(JsValue::from(base64::encode(data)).unchecked_into())
        })))
    }

    #[wasm_bindgen]
    pub fn sign(
        &self,
        message: &crate::crypto::UnsignedMessage,
        key_password: JsKeyPassword,
    ) -> Result<PromiseSignedMessage, JsValue> {
        let message = message.inner.clone();
        let inner = self.inner.clone();
        let key_password =
            JsValue::into_serde::<ParsedKeyPassword>(&key_password).handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let hash = nt::crypto::UnsignedMessage::hash(message.as_ref());
            let signature = sign_data(&inner, key_password, hash).await?;

            let message = message.sign(&signature).handle_error()?;

            crate::crypto::make_signed_message(message).map(JsValue::from)
        })))
    }

    #[wasm_bindgen(js_name = "signData")]
    pub fn sign_data(
        &self,
        data: &str,
        key_password: JsKeyPassword,
    ) -> Result<PromiseSignedData, JsValue> {
        let data = base64::decode(data).handle_error()?;
        let inner = self.inner.clone();
        let key_password =
            JsValue::into_serde::<ParsedKeyPassword>(&key_password).handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let hash: [u8; 32] = sha2::Sha256::digest(&data).into();
            let signature = sign_data(&inner, key_password, &hash).await?;

            Ok(crate::crypto::make_signed_data(hash, signature).unchecked_into())
        })))
    }

    #[wasm_bindgen(js_name = "signDataRaw")]
    pub fn sign_data_raw(
        &self,
        data: &str,
        key_password: JsKeyPassword,
    ) -> Result<PromiseSignedDataRaw, JsValue> {
        let data = base64::decode(data).handle_error()?;
        let inner = self.inner.clone();
        let key_password =
            JsValue::into_serde::<ParsedKeyPassword>(&key_password).handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let signature = sign_data(&inner, key_password, &data).await?;

            Ok(crate::crypto::make_signed_data_raw(signature).unchecked_into())
        })))
    }

    #[wasm_bindgen(js_name = "removeKey")]
    pub fn remove_key(&self, public_key: &str) -> Result<PromiseOptionKeyStoreEntry, JsValue> {
        let public_key = parse_public_key(public_key)?;

        let inner = self.inner.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            Ok(match inner.remove_key(&public_key).await.handle_error()? {
                Some(entry) => make_key_store_entry(entry).unchecked_into(),
                None => JsValue::undefined(),
            })
        })))
    }

    #[wasm_bindgen]
    pub fn clear(&self) -> PromiseVoid {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            inner.clear().await.handle_error()?;
            inner.password_cache().clear();
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(js_name = "getKeys")]
    pub fn get_stored_keys(&self) -> PromiseKeyStoreEntries {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let keys = inner.get_entries().await;

            Ok(keys
                .iter()
                .cloned()
                .map(make_key_store_entry)
                .map(JsValue::from)
                .collect::<js_sys::Array>()
                .unchecked_into())
        }))
    }
}

async fn sign_data(
    key_store: &nt::core::keystore::KeyStore,
    key_password: ParsedKeyPassword,
    data: &[u8],
) -> Result<[u8; 64], JsValue> {
    use nt::crypto::*;

    match key_password {
        ParsedKeyPassword::MasterKey {
            master_key,
            public_key,
            password,
            cache,
        } => {
            let input = DerivedKeySignParams::ByPublicKey {
                public_key: parse_public_key(&public_key)?,
                master_key: parse_public_key(&master_key)?,
                password: cached_password(password, cache),
            };
            key_store.sign::<DerivedKeySigner>(data, input).await
        }
        ParsedKeyPassword::EncryptedKey {
            public_key,
            password,
            cache,
        } => {
            let public_key = parse_public_key(&public_key)?;
            let input = EncryptedKeyPassword {
                public_key,
                password: cached_password(password, cache),
            };
            key_store.sign::<EncryptedKeySigner>(data, input).await
        }
        ParsedKeyPassword::LedgerKey(input) => key_store.sign::<LedgerKeySigner>(data, input).await,
    }
    .handle_error()
}

async fn encrypt_data(
    key_store: &nt::core::keystore::KeyStore,
    data: &[u8],
    key_password: ParsedKeyPassword,
    public_keys: &[ed25519_dalek::PublicKey],
    algorithm: nt::crypto::EncryptionAlgorithm,
) -> Result<Vec<nt::crypto::EncryptedData>, JsValue> {
    use nt::crypto::*;

    match key_password {
        ParsedKeyPassword::MasterKey {
            master_key,
            public_key,
            password,
            cache,
        } => {
            let input = DerivedKeySignParams::ByPublicKey {
                master_key: parse_public_key(&public_key)?,
                public_key: parse_public_key(&master_key)?,
                password: cached_password(password, cache),
            };
            key_store
                .encrypt::<DerivedKeySigner>(data, public_keys, algorithm, input)
                .await
        }
        ParsedKeyPassword::EncryptedKey {
            public_key,
            password,
            cache,
        } => {
            let input = EncryptedKeyPassword {
                public_key: parse_public_key(&public_key)?,
                password: cached_password(password, cache),
            };
            key_store
                .encrypt::<EncryptedKeySigner>(data, public_keys, algorithm, input)
                .await
        }
        ParsedKeyPassword::LedgerKey(input) => {
            key_store
                .encrypt::<LedgerKeySigner>(data, public_keys, algorithm, input)
                .await
        }
    }
    .handle_error()
}

async fn decrypt_data(
    key_store: &nt::core::keystore::KeyStore,
    data: nt::crypto::EncryptedData,
    key_password: ParsedKeyPassword,
) -> Result<Vec<u8>, JsValue> {
    use nt::crypto::*;

    match key_password {
        ParsedKeyPassword::MasterKey {
            master_key,
            public_key,
            password,
            cache,
        } => {
            let input = DerivedKeySignParams::ByPublicKey {
                master_key: parse_public_key(&public_key)?,
                public_key: parse_public_key(&master_key)?,
                password: cached_password(password, cache),
            };
            key_store.decrypt::<DerivedKeySigner>(&data, input).await
        }
        ParsedKeyPassword::EncryptedKey {
            public_key,
            password,
            cache,
        } => {
            let input = EncryptedKeyPassword {
                public_key: parse_public_key(&public_key)?,
                password: cached_password(password, cache),
            };
            key_store.decrypt::<EncryptedKeySigner>(&data, input).await
        }
        ParsedKeyPassword::LedgerKey(input) => {
            key_store.decrypt::<LedgerKeySigner>(&data, input).await
        }
    }
    .handle_error()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<Array<EncryptedData>>")]
    pub type PromiseEncryptedData;

    #[wasm_bindgen(typescript_type = "EncryptedData")]
    pub type EncryptedData;

    #[wasm_bindgen(typescript_type = "Array<string>")]
    pub type PublicKeysList;

    #[wasm_bindgen(typescript_type = "Promise<SignedMessage>")]
    pub type PromiseSignedMessage;

    #[wasm_bindgen(typescript_type = "Promise<SignedData>")]
    pub type PromiseSignedData;

    #[wasm_bindgen(typescript_type = "Promise<SignedDataRaw>")]
    pub type PromiseSignedDataRaw;

    #[wasm_bindgen(typescript_type = "Promise<Array<KeyStoreEntry>>")]
    pub type PromiseKeyStoreEntries;

    #[wasm_bindgen(typescript_type = "Promise<KeyStoreEntry>")]
    pub type PromiseKeyStoreEntry;

    #[wasm_bindgen(typescript_type = "Promise<KeyStoreEntry | undefined>")]
    pub type PromiseOptionKeyStoreEntry;

    #[wasm_bindgen(typescript_type = "Promise<KeyStore>")]
    pub type PromiseKeyStore;
}

fn parse_public_key_list(
    public_keys: PublicKeysList,
) -> Result<Vec<ed25519_dalek::PublicKey>, JsValue> {
    let public_keys: JsValue = public_keys.unchecked_into();
    if !js_sys::Array::is_array(&public_keys) {
        return Err("Public keys array expected").handle_error()?;
    }
    let public_keys: js_sys::Array = public_keys.unchecked_into();

    let mut result = Vec::with_capacity(public_keys.length() as usize);
    for public_key in public_keys.iter() {
        match public_key.as_string() {
            Some(public_key) => result.push(parse_public_key(&public_key)?),
            None => return Err("Invalid public key").handle_error(),
        }
    }

    Ok(result)
}

#[wasm_bindgen(typescript_custom_section)]
const ENCRYPTION_ALGORITHM: &str = r#"
export type EncryptionAlgorithm =
    | 'ChaCha20Poly1305';
"#;

#[wasm_bindgen(typescript_custom_section)]
const ENCRYPTED_DATA: &str = r#"
export type EncryptedData = {
    algorithm: EncryptionAlgorithm;
    sourcePublicKey: string;
    recipientPublicKey: string;
    data: string;
    nonce: string;
};
"#;

pub fn parse_encrypted_data(data: EncryptedData) -> Result<nt::crypto::EncryptedData, JsValue> {
    JsValue::into_serde::<nt::crypto::EncryptedData>(&data).handle_error()
}

pub fn make_encrypted_data(encrypted_data: nt::crypto::EncryptedData) -> EncryptedData {
    ObjectBuilder::new()
        .set(
            "algorithm",
            match encrypted_data.algorithm {
                nt::crypto::EncryptionAlgorithm::ChaCha20Poly1305 => "ChaCha20Poly1305",
            },
        )
        .set(
            "sourcePublicKey",
            hex::encode(encrypted_data.source_public_key.as_bytes()),
        )
        .set(
            "recipientPublicKey",
            hex::encode(encrypted_data.recipient_public_key.as_bytes()),
        )
        .set("data", base64::encode(encrypted_data.data))
        .set("nonce", base64::encode(encrypted_data.nonce))
        .build()
        .unchecked_into()
}

const DERIVED_SIGNER: &str = "master_key";
const ENCRYPTED_SIGNER: &str = "encrypted_key";
const LEDGER_SIGNER: &str = "ledger_key";

#[wasm_bindgen(typescript_custom_section)]
const NEW_KEY: &str = r#"
export type NewKey =
    | EnumItem<'master_key', { name?: string, params: MasterKeyParams | DerivedKeyParams, password: string }>
    | EnumItem<'encrypted_key', { name?: string, phrase: string, mnemonicType: MnemonicType, password: string }>
    | EnumItem<'ledger_key', { name?: string, accountId: number }>;
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "NewKey")]
    pub type JsNewKey;
}

#[allow(clippy::enum_variant_names)]
#[derive(Deserialize)]
#[serde(tag = "type", content = "data", rename_all = "snake_case")]
enum ParsedNewKey {
    #[serde(rename_all = "camelCase")]
    MasterKey {
        #[serde(default)]
        name: Option<String>,
        params: ParsedNewMasterKeyParams,
        password: String,
    },
    #[serde(rename_all = "camelCase")]
    EncryptedKey {
        #[serde(default)]
        name: Option<String>,
        phrase: String,
        mnemonic_type: crate::crypto::ParsedMnemonicType,
        password: String,
    },
    #[serde(rename_all = "camelCase")]
    LedgerKey {
        #[serde(default)]
        name: Option<String>,
        account_id: u16,
    },
}

#[wasm_bindgen(typescript_custom_section)]
const NEW_MASTER_KEY_PARAMS: &str = r#"
export type MasterKeyParams = { phrase: string };
export type DerivedKeyParams = { masterKey: string, accountId: number };
"#;

#[derive(Deserialize)]
#[serde(untagged)]
enum ParsedNewMasterKeyParams {
    #[serde(rename_all = "camelCase")]
    MasterKeyParams { phrase: String },
    #[serde(rename_all = "camelCase")]
    DerivedKeyParams { master_key: String, account_id: u16 },
}

#[wasm_bindgen(typescript_custom_section)]
const RENAME_KEY: &str = r#"
export type RenameKey =
    | EnumItem<'master_key', { masterKey: string, publicKey: string, name: string }>
    | EnumItem<'encrypted_key', { publicKey: string, name: string }>
    | EnumItem<'ledger_key', { publicKey: string, name: string }>;
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "RenameKey")]
    pub type JsRenameKey;
}

#[derive(Deserialize)]
#[serde(tag = "type", content = "data", rename_all = "snake_case")]
enum ParsedRenameKey {
    #[serde(rename_all = "camelCase")]
    MasterKey {
        master_key: String,
        public_key: String,
        name: String,
    },
    #[serde(rename_all = "camelCase")]
    EncryptedKey { public_key: String, name: String },
    #[serde(rename_all = "camelCase")]
    LedgerKey { public_key: String, name: String },
}

#[wasm_bindgen(typescript_custom_section)]
const CHANGE_KEY_PASSWORD: &str = r#"
export type ChangeKeyPassword =
    | EnumItem<'master_key', { masterKey: string, oldPassword: string, newPassword: string }>
    | EnumItem<'encrypted_key', { publicKey: string, oldPassword: string, newPassword: string }>;
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "ChangeKeyPassword")]
    pub type JsChangeKeyPassword;
}

#[derive(Deserialize)]
#[serde(tag = "type", content = "data", rename_all = "snake_case")]
enum ParsedChangeKeyPassword {
    #[serde(rename_all = "camelCase")]
    MasterKey {
        master_key: String,
        old_password: String,
        new_password: String,
    },
    #[serde(rename_all = "camelCase")]
    EncryptedKey {
        public_key: String,
        old_password: String,
        new_password: String,
    },
}

#[wasm_bindgen(typescript_custom_section)]
const EXPORT_KEY: &str = r#"
export type ExportKey =
    | EnumItem<'master_key', { masterKey: string, password: string }>
    | EnumItem<'encrypted_key', { publicKey: string, password: string }>;
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "ExportKey")]
    pub type JsExportKey;
}

#[derive(Deserialize)]
#[serde(tag = "type", content = "data", rename_all = "snake_case")]
enum ParsedExportKey {
    #[serde(rename_all = "camelCase")]
    MasterKey {
        master_key: String,
        password: String,
    },
    #[serde(rename_all = "camelCase")]
    EncryptedKey {
        public_key: String,
        password: String,
    },
}

#[wasm_bindgen(typescript_custom_section)]
const GET_PUBLIC_KEYS: &str = r#"
export type GetPublicKeys =
    | EnumItem<'master_key', { masterKey: string, password?: string, cache?: boolean, offset: number, limit: number }>
    | EnumItem<'ledger_key', { offset: number, limit: number }>;
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "GetPublicKeys")]
    pub type JsGetPublicKeys;
}

#[derive(Deserialize)]
#[serde(tag = "type", content = "data", rename_all = "snake_case")]
enum ParsedGetPublicKeys {
    #[serde(rename_all = "camelCase")]
    MasterKey {
        master_key: String,
        password: Option<String>,
        #[serde(default, deserialize_with = "deserialize_cache_behavior")]
        cache: nt::crypto::PasswordCacheBehavior,
        offset: u16,
        limit: u16,
    },
    #[serde(rename_all = "camelCase")]
    LedgerKey { offset: u16, limit: u16 },
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<string[]>")]
    pub type PromisePublicKeys;
}

fn make_public_keys_list(public_keys: Vec<ed25519_dalek::PublicKey>) -> JsValue {
    public_keys
        .into_iter()
        .map(|item| hex::encode(item.as_bytes()))
        .map(JsValue::from)
        .collect::<js_sys::Array>()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const EXPORTED_KEY: &str = r#"
export type ExportedKey =
    | { type: 'master_key', phrase: string  }
    | { type: 'encrypted_key', phrase: string, mnemonicType: MnemonicType };
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "ExportedKey")]
    pub type JsExportedKey;

    #[wasm_bindgen(typescript_type = "Promise<ExportedKey>")]
    pub type PromiseExportedKey;
}

fn make_exported_master_key(data: nt::crypto::DerivedKeyExportOutput) -> JsExportedKey {
    ObjectBuilder::new()
        .set("type", "master_key")
        .set("phrase", data.phrase.unsecure())
        .build()
        .unchecked_into()
}

fn make_exported_encrypted_key(data: nt::crypto::EncryptedKeyExportOutput) -> JsExportedKey {
    ObjectBuilder::new()
        .set("type", "encrypted_key")
        .set("phrase", data.phrase.unsecure())
        .set(
            "mnemonicType",
            crate::crypto::make_mnemonic_type(data.mnemonic_type),
        )
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const KEY_PASSWORD: &str = r#"
export type KeyPassword =
    | EnumItem<'master_key', { masterKey: string, publicKey: string, password?: string, cache?: boolean }>
    | EnumItem<'encrypted_key', { publicKey: string, password?: string, cache?: boolean }>
    | EnumItem<'ledger_key', { publicKey: string, context?: LedgerSignatureContext }>;
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "KeyPassword")]
    pub type JsKeyPassword;
}

#[allow(clippy::enum_variant_names)]
#[derive(Deserialize)]
#[serde(tag = "type", content = "data", rename_all = "snake_case")]
enum ParsedKeyPassword {
    #[serde(rename_all = "camelCase")]
    MasterKey {
        master_key: String,
        public_key: String,
        password: Option<String>,
        #[serde(default, deserialize_with = "deserialize_cache_behavior")]
        cache: nt::crypto::PasswordCacheBehavior,
    },
    #[serde(rename_all = "camelCase")]
    EncryptedKey {
        public_key: String,
        password: Option<String>,
        #[serde(default, deserialize_with = "deserialize_cache_behavior")]
        cache: nt::crypto::PasswordCacheBehavior,
    },
    LedgerKey(nt::crypto::LedgerSignInput),
}

#[wasm_bindgen(typescript_custom_section)]
const MESSAGE: &str = r#"
export type KeyStoreEntry = {
    name: string,
    signerName: 'master_key' | 'encrypted_key' | 'ledger_key',
    publicKey: string,
    masterKey: string,
    accountId: number,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "KeyStoreEntry")]
    pub type KeyStoreEntry;
}

fn make_key_store_entry(data: nt::core::keystore::KeyStoreEntry) -> KeyStoreEntry {
    ObjectBuilder::new()
        .set("name", data.name)
        .set("signerName", data.signer_name)
        .set("publicKey", hex::encode(data.public_key.as_bytes()))
        .set("masterKey", hex::encode(data.master_key.as_bytes()))
        .set("accountId", data.account_id)
        .build()
        .unchecked_into()
}

fn cached_password(
    password: Option<String>,
    cache_behavior: nt::crypto::PasswordCacheBehavior,
) -> nt::crypto::Password {
    match password {
        Some(password) => nt::crypto::Password::Explicit {
            password: password.into(),
            cache_behavior,
        },
        None => nt::crypto::Password::FromCache,
    }
}

fn explicit_password(password: String) -> nt::crypto::Password {
    nt::crypto::Password::Explicit {
        password: password.into(),
        cache_behavior: Default::default(),
    }
}

fn deserialize_cache_behavior<'de, D>(
    deserializer: D,
) -> Result<nt::crypto::PasswordCacheBehavior, <D as serde::Deserializer<'de>>::Error>
where
    D: serde::Deserializer<'de>,
{
    let cache = bool::deserialize(deserializer)?;
    Ok(if cache {
        nt::crypto::PasswordCacheBehavior::Store(KEYSTORE_CACHE_DURATION)
    } else {
        nt::crypto::PasswordCacheBehavior::Remove
    })
}

const KEYSTORE_CACHE_DURATION: Duration = Duration::from_secs(960); // 16 min
const KEYSTORE_CACHE_GAP: Duration = Duration::from_secs(60); // 1 min
