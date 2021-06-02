use std::sync::Arc;

use serde::Deserialize;
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
    pub fn load(
        storage: &crate::external::Storage,
        ledger_connection: &crate::external::LedgerConnection,
    ) -> PromiseKeyStore {
        let storage = storage.inner.clone();
        let ledger_connection = ledger_connection.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let inner = Arc::new(
                nt::core::keystore::KeyStore::builder(storage as Arc<dyn nt::external::Storage>)
                    .with_signer(DERIVED_SIGNER, nt::crypto::DerivedKeySigner::new())
                    .handle_error()?
                    .with_signer(ENCRYPTED_SIGNER, nt::crypto::EncryptedKeySigner::new())
                    .handle_error()?
                    .with_signer(
                        LEDGER_SIGNER,
                        nt::crypto::LedgerKeySigner::new(ledger_connection),
                    )
                    .handle_error()?
                    .load()
                    .await
                    .handle_error()?,
            );

            Ok(JsValue::from(Self { inner }))
        }))
    }

    #[wasm_bindgen(js_name = "addKey")]
    pub fn add_key(&self, new_key: JsNewKey) -> Result<PromiseKeyStoreEntry, JsValue> {
        use nt::crypto::*;

        let inner = self.inner.clone();
        let new_key = JsValue::into_serde::<ParsedNewKey>(&new_key).handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let entry = match new_key {
                ParsedNewKey::MasterKey { params, password } => {
                    inner
                        .add_key::<DerivedKeySigner>(match params {
                            ParsedNewMasterKeyParams::MasterKeyParams { phrase } => {
                                DerivedKeyCreateInput::Import {
                                    phrase: phrase.into(),
                                    password: password.into(),
                                }
                            }
                            ParsedNewMasterKeyParams::DerivedKeyParams {
                                master_key,
                                account_id,
                            } => DerivedKeyCreateInput::Derive {
                                master_key: parse_public_key(&master_key)?,
                                account_id,
                                password: password.into(),
                            },
                        })
                        .await
                }
                ParsedNewKey::EncryptedKey {
                    phrase,
                    mnemonic_type,
                    password,
                } => {
                    inner
                        .add_key::<EncryptedKeySigner>(EncryptedKeyCreateInput {
                            phrase: phrase.into(),
                            mnemonic_type: mnemonic_type.into(),
                            password: password.into(),
                        })
                        .await
                }
                ParsedNewKey::LedgerKey { account_id } => {
                    inner
                        .add_key::<LedgerKeySigner>(LedgerKeyCreateInput { account_id })
                        .await
                }
            }
            .handle_error()?;

            Ok(JsValue::from(make_key_store_entry(entry)))
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
                    let input = DerivedKeyUpdateParams {
                        master_key: parse_public_key(&master_key)?,
                        old_password: old_password.into(),
                        new_password: new_password.into(),
                    };

                    inner.update_key::<DerivedKeySigner>(input).await
                }
                ParsedChangeKeyPassword::EncryptedKey {
                    public_key,
                    old_password,
                    new_password,
                } => {
                    let public_key = parse_public_key(&public_key)?;
                    let input = EncryptedKeyUpdateParams {
                        public_key,
                        old_password: old_password.into(),
                        new_password: new_password.into(),
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
                        password: password.into(),
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
                        password: password.into(),
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
        } => {
            let input = DerivedKeySignParams::ByPublicKey {
                public_key: parse_public_key(&public_key)?,
                master_key: parse_public_key(&master_key)?,
                password: password.into(),
            };
            key_store.sign::<DerivedKeySigner>(data, input).await
        }
        ParsedKeyPassword::EncryptedKey {
            public_key,
            password,
        } => {
            let public_key = parse_public_key(&public_key)?;
            let input = EncryptedKeyPassword {
                public_key,
                password: password.into(),
            };
            key_store.sign::<EncryptedKeySigner>(data, input).await
        }
        ParsedKeyPassword::LedgerKey { public_key } => {
            let public_key = parse_public_key(&public_key)?;
            let input = LedgerKeyPublic { public_key };
            key_store.sign::<LedgerKeySigner>(data, input).await
        }
    }
    .handle_error()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<SignedMessage>")]
    pub type PromiseSignedMessage;

    #[wasm_bindgen(typescript_type = "Promise<Array<KeyStoreEntry>>")]
    pub type PromiseKeyStoreEntries;

    #[wasm_bindgen(typescript_type = "Promise<KeyStoreEntry>")]
    pub type PromiseKeyStoreEntry;

    #[wasm_bindgen(typescript_type = "Promise<KeyStoreEntry | undefined>")]
    pub type PromiseOptionKeyStoreEntry;

    #[wasm_bindgen(typescript_type = "Promise<KeyStore>")]
    pub type PromiseKeyStore;
}

const DERIVED_SIGNER: &str = "master_key";
const ENCRYPTED_SIGNER: &str = "encrypted_key";
const LEDGER_SIGNER: &str = "ledger_key";

#[wasm_bindgen(typescript_custom_section)]
const NEW_KEY: &str = r#"
export type NewKey =
    | EnumItem<'master_key', { params: MasterKeyParams | DerivedKeyParams, password: string }>
    | EnumItem<'encrypted_key', { phrase: string, mnemonicType: MnemonicType, password: string }>
    | EnumItem<'ledger_key', { accountId: number }>;
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
        params: ParsedNewMasterKeyParams,
        password: String,
    },
    #[serde(rename_all = "camelCase")]
    EncryptedKey {
        phrase: String,
        mnemonic_type: crate::crypto::ParsedMnemonicType,
        password: String,
    },
    #[serde(rename_all = "camelCase")]
    LedgerKey { account_id: u16 },
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
const CHANGE_KEY_PASSWORD: &str = r#"
export type ChangeKeyPassword =
    | EnumItem<'master_key', { masterKey: string, oldPassword: string, newPassword: string }>
    | EnumItem<'encrypted_key', { masterKey: string, publicKey: string, oldPassword: string, newPassword: string }>;
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
    | EnumItem<'encrypted_key', { masterKey: string, publicKey: string, password: string }>;
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
    | EnumItem<'master_key', { masterKey: string, publicKey: string, password: string }>
    | EnumItem<'encrypted_key', { publicKey: string, password: string }>
    | EnumItem<'ledger_key', { publicKey: string }>;
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
        password: String,
    },
    #[serde(rename_all = "camelCase")]
    EncryptedKey {
        public_key: String,
        password: String,
    },
    #[serde(rename_all = "camelCase")]
    LedgerKey { public_key: String },
}

#[wasm_bindgen(typescript_custom_section)]
const MESSAGE: &str = r#"
export type KeyStoreEntry = {
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
        .set("signerName", data.signer_name)
        .set("publicKey", hex::encode(data.public_key.as_bytes()))
        .set("masterKey", hex::encode(data.master_key.as_bytes()))
        .set("accountId", data.account_id)
        .build()
        .unchecked_into()
}
