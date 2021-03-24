use std::collections::hash_map::{self, HashMap};
use std::sync::{Arc, Mutex};

use anyhow::Result;
use async_trait::async_trait;
use futures::channel::oneshot;
use js_sys::Function;
use libnekoton::storage::{self, KvStorage};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use crate::crypto::{AccountType, StoredKey};
use crate::utils::*;

const STORAGE_KEYSTORE: &str = "keystore";

#[wasm_bindgen]
pub struct KeyStore {
    #[wasm_bindgen(skip)]
    pub storage: Arc<StorageImpl>,
    #[wasm_bindgen(skip)]
    pub keys: Arc<Mutex<HashMap<String, storage::StoredKey>>>,
}

#[wasm_bindgen]
impl KeyStore {
    #[wasm_bindgen]
    pub fn load(storage: &Storage) -> PromiseKeyStore {
        struct KeysMap(HashMap<String, storage::StoredKey>);

        impl<'de> serde::Deserialize<'de> for KeysMap {
            fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
            where
                D: serde::Deserializer<'de>,
            {
                use serde::de::Error;

                let keys = HashMap::<String, String>::deserialize(deserializer)?;
                let keys = keys
                    .into_iter()
                    .map(|(public_key, stored)| {
                        let stored =
                            storage::StoredKey::from_reader(&mut std::io::Cursor::new(stored))
                                .map_err(|_| D::Error::custom("Failed to deserialize StoredKey"))?;
                        Ok((public_key, stored))
                    })
                    .collect::<Result<_, _>>()?;
                Ok(KeysMap(keys))
            }
        }

        let storage = storage.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let data = match storage.get(STORAGE_KEYSTORE).await.handle_error()? {
                Some(data) => serde_json::from_str::<KeysMap>(&data).handle_error()?.0,
                None => HashMap::new(),
            };

            Ok(JsValue::from(Self {
                storage,
                keys: Arc::new(Mutex::new(data)),
            }))
        }))
    }

    #[wasm_bindgen(js_name = "addKey")]
    pub fn add_key(&self, key: StoredKey) -> Result<PromiseString, JsValue> {
        struct KeysMap<'a>(&'a HashMap<String, storage::StoredKey>);

        impl<'a> serde::Serialize for KeysMap<'a> {
            fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
            where
                S: serde::Serializer,
            {
                use serde::ser::SerializeMap;
                let mut map = serializer.serialize_map(Some(self.0.len()))?;
                for (key, value) in self.0.iter() {
                    map.serialize_entry(key, &value.as_json())?;
                }
                map.end()
            }
        }

        let public_key = hex::encode(key.inner.public_key());

        let new_data = {
            let mut keys = self.keys.lock().trust_me();
            match keys.entry(public_key.clone()) {
                hash_map::Entry::Occupied(_) => {
                    return Err(KeyStoreError::KeyNotFound).handle_error()
                }
                hash_map::Entry::Vacant(entry) => {
                    entry.insert(key.inner);
                }
            }
            serde_json::to_string(&KeysMap(&*keys)).trust_me()
        };

        let inner = self.storage.clone();
        Ok(JsCast::unchecked_into(future_to_promise(async move {
            inner
                .set(STORAGE_KEYSTORE, &new_data)
                .await
                .handle_error()?;
            Ok(JsValue::from(public_key))
        })))
    }

    #[wasm_bindgen(js_name = "getKey")]
    pub fn get_key(&self, public_key: &str) -> Option<StoredKey> {
        let keys = self.keys.lock().trust_me();
        keys.get(public_key)
            .map(|key| StoredKey { inner: key.clone() })
    }

    #[wasm_bindgen(getter, js_name = "storedKeys")]
    pub fn stored_keys(&self) -> KeyStoreEntries {
        let keys = self.keys.lock().trust_me();
        keys.iter()
            .map(|(public_key, stored)| {
                JsValue::from(KeyStoreEntry {
                    public_key: public_key.clone(),
                    account_type: stored.account_type(),
                })
            })
            .collect::<js_sys::Array>()
            .unchecked_into()
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Array<KeyStoreEntry>")]
    pub type KeyStoreEntries;

    #[wasm_bindgen(typescript_type = "Promise<KeyStore>")]
    pub type PromiseKeyStore;
}

#[wasm_bindgen]
pub struct KeyStoreEntry {
    #[wasm_bindgen(skip)]
    pub public_key: String,
    #[wasm_bindgen(skip)]
    pub account_type: storage::AccountType,
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

#[derive(thiserror::Error, Debug)]
pub enum KeyStoreError {
    #[error("Key already exists")]
    KeyAlreadyExists,
    #[error("Key not found")]
    KeyNotFound,
    #[error("Invalid key")]
    InvalidKey,
}

#[wasm_bindgen]
extern "C" {
    pub type StorageConnector;

    #[wasm_bindgen(method)]
    pub fn get(this: &StorageConnector, key: &str, handler: StorageQueryResultHandler);

    #[wasm_bindgen(method)]
    pub fn set(this: &StorageConnector, key: &str, value: &str, handler: StorageQueryHandler);

    #[wasm_bindgen(method, js_name = "setUnchecked")]
    pub fn set_unchecked(this: &StorageConnector, key: &str, value: &str);

    #[wasm_bindgen(method)]
    pub fn remove(this: &StorageConnector, key: &str, handler: StorageQueryHandler);

    #[wasm_bindgen(method, js_name = "removeUnchecked")]
    pub fn remove_unchecked(this: &StorageConnector, key: &str);
}

unsafe impl Send for StorageConnector {}
unsafe impl Sync for StorageConnector {}

#[wasm_bindgen]
pub struct StorageQueryResultHandler {
    #[wasm_bindgen(skip)]
    pub inner: QueryResultHandler<Option<String>>,
}

#[wasm_bindgen]
impl StorageQueryResultHandler {
    #[wasm_bindgen(js_name = "onResult")]
    pub fn on_result(self, data: Option<String>) {
        self.inner.send(Ok(data))
    }

    #[wasm_bindgen(js_name = "onError")]
    pub fn on_error(self, _: JsValue) {
        self.inner.send(Err(StorageError::QueryFailed.into()))
    }
}

#[wasm_bindgen]
pub struct StorageQueryHandler {
    #[wasm_bindgen(skip)]
    pub inner: QueryResultHandler<()>,
}

#[wasm_bindgen]
impl StorageQueryHandler {
    #[wasm_bindgen(js_name = "onResult")]
    pub fn on_result(self) {
        self.inner.send(Ok(()))
    }

    #[wasm_bindgen(js_name = "onError")]
    pub fn on_error(self, _: JsValue) {
        self.inner.send(Err(StorageError::QueryFailed.into()))
    }
}

#[wasm_bindgen]
pub struct Storage {
    #[wasm_bindgen(skip)]
    pub inner: Arc<StorageImpl>,
}

#[wasm_bindgen]
impl Storage {
    #[wasm_bindgen(constructor)]
    pub fn new(connector: StorageConnector) -> Storage {
        Storage {
            inner: Arc::new(StorageImpl::new(connector)),
        }
    }
}

pub struct StorageImpl {
    connector: Arc<StorageConnector>,
}

impl StorageImpl {
    fn new(connector: StorageConnector) -> Self {
        Self {
            connector: Arc::new(connector),
        }
    }
}

#[async_trait]
impl KvStorage for StorageImpl {
    async fn get(&self, key: &str) -> Result<Option<String>> {
        let (tx, rx) = oneshot::channel();
        self.connector.get(
            key,
            StorageQueryResultHandler {
                inner: QueryHandler::new(tx),
            },
        );
        rx.await.map_err(|_| StorageError::QueryDropped)?
    }

    async fn set(&self, key: &str, value: &str) -> Result<()> {
        let (tx, rx) = oneshot::channel();
        self.connector.set(
            key,
            value,
            StorageQueryHandler {
                inner: QueryHandler::new(tx),
            },
        );
        rx.await.map_err(|_| StorageError::QueryDropped)?
    }

    fn set_unchecked(&self, key: &str, value: &str) {
        self.connector.set_unchecked(key, value);
    }

    async fn remove(&self, key: &str) -> Result<()> {
        let (tx, rx) = oneshot::channel();
        self.connector.remove(
            key,
            StorageQueryHandler {
                inner: QueryHandler::new(tx),
            },
        );
        rx.await.map_err(|_| StorageError::QueryDropped)?
    }

    fn remove_unchecked(&self, key: &str) {
        self.connector.remove_unchecked(key);
    }
}

#[derive(thiserror::Error, Debug)]
pub enum StorageError {
    #[error("Storage query dropped")]
    QueryDropped,
    #[error("Query failed")]
    QueryFailed,
}
