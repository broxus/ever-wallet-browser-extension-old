use std::sync::Arc;

use libnekoton::crypto;
use libnekoton::external;
use libnekoton::storage;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use crate::utils::*;

const DERIVED_SIGNER: &str = "derived_key_signer";

#[wasm_bindgen]
pub struct KeyStore {
    #[wasm_bindgen(skip)]
    pub inner: Arc<storage::KeyStore>,
}

#[wasm_bindgen]
impl KeyStore {
    #[wasm_bindgen]
    pub fn load(storage: &crate::storage::Storage) -> PromiseKeyStore {
        let storage = storage.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let inner = Arc::new(
                storage::KeyStore::new(storage as Arc<dyn external::Storage>)
                    .with_signer(DERIVED_SIGNER, crypto::DerivedKeySigner::new())
                    .handle_error()?
                    .load()
                    .await
                    .handle_error()?,
            );

            Ok(JsValue::from(Self { inner }))
        }))
    }

    #[wasm_bindgen(js_name = "setMasterKey")]
    pub fn add_key(&self, name: String, phrase: String, password: String) -> PromiseString {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let entry = inner
                .add_key::<crypto::DerivedKeySigner>(
                    &name,
                    crypto::DerivedKeyCreateInput::Import {
                        phrase: phrase.into(),
                        password: password.into(),
                    },
                )
                .await
                .handle_error()?;
            Ok(JsValue::from(hex::encode(entry.public_key.as_bytes())))
        }))
    }

    #[wasm_bindgen(js_name = "removeKey")]
    pub fn remove_key(&self, public_key: String) -> Result<PromiseVoid, JsValue> {
        let inner = self.inner.clone();
        let public_key =
            ed25519_dalek::PublicKey::from_bytes(&hex::decode(&public_key).handle_error()?)
                .handle_error()?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            inner.remove_key(&public_key).await.handle_error()?;
            Ok(JsValue::undefined())
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

    #[wasm_bindgen]
    pub fn sign(
        &self,
        message: &crate::core::wallet::UnsignedMessage,
        password: String,
    ) -> PromiseSignedMessage {
        let inner = self.inner.clone();
        let message = message.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let hash = crypto::UnsignedMessage::hash(message.as_ref());
            let signature = inner
                .sign::<crypto::DerivedKeySigner>(
                    hash,
                    crypto::DerivedKeySignParams {
                        account_id: 0,
                        password: password.into(),
                    },
                )
                .await
                .handle_error()?;
            Ok(JsValue::from(crate::core::wallet::SignedMessage {
                inner: message.sign(&signature).handle_error()?,
            }))
        }))
    }

    #[wasm_bindgen(js_name = "getKeys")]
    pub fn get_stored_keys(&self) -> PromiseKeyStoreEntries {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let keys = inner.get_entries().await;

            Ok(keys
                .iter()
                .map(|entry| {
                    JsValue::from(KeyStoreEntry {
                        name: entry.name.clone(),
                        public_key: hex::encode(entry.public_key.as_bytes()),
                    })
                })
                .collect::<js_sys::Array>()
                .unchecked_into())
        }))
    }

    #[wasm_bindgen(js_name = "ChangeMasterPassword")]
    pub fn change_master_password(&self, old: String, new: String) -> PromiseVoid {
        use libnekoton::crypto::{DerivedKeySigner, DerivedKeyUpdateParams};
        let update = DerivedKeyUpdateParams::ChangePassword {
            old_password: old.into(),
            new_password: new.into(),
        };
        let inner = self.inner.clone();
        JsCast::unchecked_into(future_to_promise(async move {
            inner
                .update_key::<DerivedKeySigner>(update)
                .await
                .handle_error()?;
            Ok(JsValue::undefined())
        }))
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<SignedMessage>")]
    pub type PromiseSignedMessage;

    #[wasm_bindgen(typescript_type = "Promise<Array<KeyStoreEntry>>")]
    pub type PromiseKeyStoreEntries;

    #[wasm_bindgen(typescript_type = "Promise<StoredKey>")]
    pub type PromiseStoredKey;

    #[wasm_bindgen(typescript_type = "Promise<StoredKey | undefined>")]
    pub type PromiseOptionStoredKey;

    #[wasm_bindgen(typescript_type = "Promise<KeyStore>")]
    pub type PromiseKeyStore;
}

#[wasm_bindgen]
pub struct KeyStoreEntry {
    #[wasm_bindgen(skip)]
    pub name: String,
    #[wasm_bindgen(skip)]
    pub public_key: String,
}

#[wasm_bindgen]
impl KeyStoreEntry {
    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.name.clone()
    }

    #[wasm_bindgen(getter, js_name = "publicKey")]
    pub fn public_key(&self) -> String {
        self.public_key.clone()
    }
}
