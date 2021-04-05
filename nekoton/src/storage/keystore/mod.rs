use std::sync::Arc;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use libnekoton::crypto;
use libnekoton::external;
use libnekoton::storage;

use crate::crypto::{AccountType, StoredKey};
use crate::utils::*;

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
                storage::KeyStore::load(storage as Arc<dyn external::Storage>)
                    .await
                    .handle_error()?,
            );

            Ok(JsValue::from(Self { inner }))
        }))
    }

    #[wasm_bindgen(js_name = "addKey")]
    pub fn add_key(&self, key: &StoredKey) -> PromiseString {
        let inner = self.inner.clone();
        let key = key.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let public_key = inner.add_key(key).await.handle_error()?;
            Ok(JsValue::from(public_key))
        }))
    }

    #[wasm_bindgen(js_name = "removeKey")]
    pub fn remove_key(&self, public_key: String) -> PromiseVoid {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            inner.remove_key(&public_key).await.handle_error()?;
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen]
    pub fn clear(&self) -> PromiseVoid {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            inner.clear().await.handle_error()?;
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(js_name = "getKey")]
    pub fn get_key(&self, public_key: String) -> PromiseOptionStoredKey {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let keys = inner.stored_keys().await;
            Ok(JsValue::from(
                keys.get(&public_key)
                    .cloned()
                    .map(|inner| StoredKey { inner }),
            ))
        }))
    }

    #[wasm_bindgen(js_name = "getStoredKeys")]
    pub fn get_stored_keys(&self) -> PromiseKeyStoreEntries {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let keys = inner.stored_keys().await;

            Ok(keys
                .iter()
                .map(|(public_key, stored)| {
                    JsValue::from(KeyStoreEntry {
                        public_key: public_key.clone(),
                        account_type: stored.account_type(),
                    })
                })
                .collect::<js_sys::Array>()
                .unchecked_into())
        }))
    }
}

#[wasm_bindgen]
extern "C" {
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
    pub public_key: String,
    #[wasm_bindgen(skip)]
    pub account_type: crypto::MnemonicType,
}

#[wasm_bindgen]
impl KeyStoreEntry {
    #[wasm_bindgen(getter, js_name = "publicKey")]
    pub fn public_key(&self) -> String {
        self.public_key.clone()
    }

    #[wasm_bindgen(getter, js_name = "accountType")]
    pub fn account_type(&self) -> AccountType {
        AccountType::new(self.account_type)
    }
}
