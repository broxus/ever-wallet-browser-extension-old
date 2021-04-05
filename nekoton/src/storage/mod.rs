mod accounts;
mod keystore;

use std::str::FromStr;
use std::sync::Arc;

use anyhow::Result;
use async_trait::async_trait;
use futures::channel::oneshot;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use libnekoton::core;
use libnekoton::external;
use libnekoton::utils::*;

use crate::utils::*;

const STORAGE_MAIN_WALLET_STATE_CACHE: &str = "mwsc";

#[wasm_bindgen]
pub struct TonWalletStateCache {
    #[wasm_bindgen(skip)]
    pub storage: Arc<StorageImpl>,
}

impl TonWalletStateCache {
    fn make_key(address: &str) -> Result<String, JsValue> {
        let address = ton_block::MsgAddressInt::from_str(address).handle_error()?;
        let key = format!("{}{}", STORAGE_MAIN_WALLET_STATE_CACHE, address);
        Ok(key)
    }
}

#[wasm_bindgen]
impl TonWalletStateCache {
    #[wasm_bindgen(constructor)]
    pub fn new(storage: &Storage) -> TonWalletStateCache {
        Self {
            storage: storage.inner.clone(),
        }
    }

    #[wasm_bindgen]
    pub fn load(&self, address: &str) -> Result<PromiseOptionAccountState, JsValue> {
        use external::Storage;

        let key = Self::make_key(address)?;
        let storage = self.storage.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let data = match storage.get(&key).await.handle_error()? {
                Some(data) => data,
                None => return Ok(JsValue::undefined()),
            };

            let data = serde_json::from_str::<core::models::AccountState>(&data).handle_error()?;

            Ok(JsValue::from(crate::core::AccountState::from(data)))
        })))
    }

    #[wasm_bindgen]
    pub fn store(&self, address: &str, state: &crate::core::AccountState) -> Result<(), JsValue> {
        use external::Storage;

        let key = Self::make_key(address)?;
        let data = serde_json::to_string(&state.inner).trust_me();
        self.storage.set_unchecked(&key, &data);
        Ok(())
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<AccountState | undefined>")]
    pub type PromiseOptionAccountState;
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
impl external::Storage for StorageImpl {
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
