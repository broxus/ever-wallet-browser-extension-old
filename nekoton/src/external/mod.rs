use std::convert::TryFrom;
use std::sync::Arc;

use anyhow::{Error, Result};
use async_trait::async_trait;
use futures::channel::oneshot;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use crate::utils::*;

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
impl nt::external::Storage for StorageImpl {
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

#[wasm_bindgen]
extern "C" {
    pub type GqlSender;

    #[wasm_bindgen(method, js_name = "isLocal")]
    pub fn is_local(this: &GqlSender) -> bool;

    #[wasm_bindgen(method)]
    pub fn send(this: &GqlSender, data: &str, handler: GqlQuery);
}

unsafe impl Send for GqlSender {}

unsafe impl Sync for GqlSender {}

pub struct GqlConnectionImpl {
    sender: Arc<GqlSender>,
}

impl GqlConnectionImpl {
    pub fn new(sender: GqlSender) -> Self {
        Self {
            sender: Arc::new(sender),
        }
    }
}

#[async_trait]
impl nt::external::GqlConnection for GqlConnectionImpl {
    fn is_local(&self) -> bool {
        self.sender.is_local()
    }

    async fn post(&self, data: &str) -> Result<String> {
        let (tx, rx) = oneshot::channel();

        self.sender.send(data, GqlQuery { tx });

        let response = rx.await.unwrap_or(Err(GqlQueryError::RequestDropped))?;
        Ok(response)
    }
}

#[wasm_bindgen]
pub struct GqlQuery {
    #[wasm_bindgen(skip)]
    pub tx: oneshot::Sender<GqlQueryResult>,
}

#[wasm_bindgen]
impl GqlQuery {
    #[wasm_bindgen(js_name = "onReceive")]
    pub fn on_receive(self, data: String) {
        let _ = self.tx.send(Ok(data));
    }

    #[wasm_bindgen(js_name = "onError")]
    pub fn on_error(self, _: JsValue) {
        let _ = self.tx.send(Err(GqlQueryError::RequestFailed));
    }

    #[wasm_bindgen(js_name = "onTimeout")]
    pub fn on_timeout(self) {
        let _ = self.tx.send(Err(GqlQueryError::TimeoutReached));
    }
}

type GqlQueryResult = Result<String, GqlQueryError>;

#[derive(thiserror::Error, Debug)]
pub enum GqlQueryError {
    #[error("Request dropped unexpectedly")]
    RequestDropped,
    #[error("Timeout reached")]
    TimeoutReached,
    #[error("Request failed")]
    RequestFailed,
}

#[wasm_bindgen(typescript_custom_section)]
pub const LEDGER_SIGNATURE_CONTEXT: &str = r#"
export type LedgerSignatureContext = {
    amount: string,
    decimals: number,
    asset: string,
    address: string,
}
"#;

#[wasm_bindgen]
extern "C" {
    pub type LedgerConnector;
    pub type LedgerSignatureContext;

    #[wasm_bindgen(method, js_name = "getPublicKey")]
    pub fn get_public_key(this: &LedgerConnector, account: u16, handler: LedgerQueryResultHandler);

    #[wasm_bindgen(method)]
    pub fn sign(
        this: &LedgerConnector,
        account: u16,
        message: &[u8],
        context: Option<LedgerSignatureContext>,
        handler: LedgerQueryResultHandler,
    );
}

unsafe impl Send for LedgerConnector {}

unsafe impl Sync for LedgerConnector {}

#[wasm_bindgen]
pub struct LedgerQueryResultHandler {
    #[wasm_bindgen(skip)]
    pub inner: QueryResultHandler<Vec<u8>>,
}

#[wasm_bindgen]
impl LedgerQueryResultHandler {
    #[wasm_bindgen(js_name = "onResult")]
    pub fn on_result(self, data: &[u8]) {
        self.inner.send(Ok(data.to_vec()))
    }

    #[wasm_bindgen(js_name = "onError")]
    pub fn on_error(self, err: JsValue) {
        let error = match err.as_string() {
            Some(v) => Error::msg(v),
            None => LedgerConnectionError::QueryFailed.into(),
        };
        self.inner.send(Err(error))
    }
}

#[wasm_bindgen]
pub struct LedgerConnection {
    #[wasm_bindgen(skip)]
    pub inner: Arc<LedgerConnectionImpl>,
}

#[wasm_bindgen]
impl LedgerConnection {
    #[wasm_bindgen(constructor)]
    pub fn new(connector: LedgerConnector) -> LedgerConnection {
        LedgerConnection {
            inner: Arc::new(LedgerConnectionImpl::new(connector)),
        }
    }
}

pub struct LedgerConnectionImpl {
    connector: Arc<LedgerConnector>,
}

impl LedgerConnectionImpl {
    fn new(connector: LedgerConnector) -> Self {
        Self {
            connector: Arc::new(connector),
        }
    }
}

#[async_trait]
impl nt::external::LedgerConnection for LedgerConnectionImpl {
    async fn get_public_key(&self, account: u16) -> Result<[u8; ed25519_dalek::PUBLIC_KEY_LENGTH]> {
        let (tx, rx) = oneshot::channel();
        self.connector.get_public_key(
            account,
            LedgerQueryResultHandler {
                inner: QueryHandler::new(tx),
            },
        );
        match rx.await.map_err(|_| LedgerConnectionError::QueryDropped)? {
            Ok(vec) => Ok(<[u8; ed25519_dalek::PUBLIC_KEY_LENGTH]>::try_from(
                vec.as_slice(),
            )?),
            Err(err) => Err(err),
        }
    }

    async fn sign(
        &self,
        account: u16,
        message: &[u8],
        context: &Option<nt::external::LedgerSignatureContext>,
    ) -> Result<[u8; ed25519_dalek::SIGNATURE_LENGTH]> {
        let (tx, rx) = oneshot::channel();
        self.connector.sign(
            account,
            message,
            context.as_ref().map(|ctx| {
                ObjectBuilder::new()
                    .set("amount", ctx.amount.to_string())
                    .set("decimals", ctx.decimals)
                    .set("asset", {
                        let as_bytes = ctx.asset.as_bytes();
                        match as_bytes.len() {
                            len if len < 32 => ctx.asset.to_string(),
                            _ => String::from_utf8_lossy(&as_bytes[..31]).to_string(),
                        }
                    })
                    .set("address", ctx.address.to_string())
                    .build()
                    .unchecked_into()
            }),
            LedgerQueryResultHandler {
                inner: QueryHandler::new(tx),
            },
        );
        match rx.await.map_err(|_| LedgerConnectionError::QueryDropped)? {
            Ok(vec) => Ok(<[u8; ed25519_dalek::SIGNATURE_LENGTH]>::try_from(
                vec.as_slice(),
            )?),
            Err(err) => Err(err),
        }
    }
}

#[derive(thiserror::Error, Debug)]
pub enum LedgerConnectionError {
    #[error("Ledger query dropped")]
    QueryDropped,
    #[error("Query failed")]
    QueryFailed,
}

unsafe impl Send for JrpcSender {}
unsafe impl Sync for JrpcSender {}

#[wasm_bindgen]
extern "C" {
    pub type JrpcSender;
    #[wasm_bindgen(method)]
    pub fn send(this: &JrpcSender, data: &str, query: JrpcQuery);
}

#[derive(Clone)]
pub struct JrpcConnector {
    sender: Arc<JrpcSender>,
}

impl JrpcConnector {
    pub fn new(sender: JrpcSender) -> Self {
        Self {
            sender: Arc::new(sender),
        }
    }
}

#[wasm_bindgen]
pub struct JrpcQuery {
    #[wasm_bindgen(skip)]
    pub tx: oneshot::Sender<JrpcQueryResult>,
}

pub type JrpcQueryResult = Result<String, JrpcError>;

#[derive(thiserror::Error, Debug)]
pub enum JrpcError {
    #[error("Request dropped unexpectedly")]
    RequestDropped,
    #[error("Timeout reached")]
    TimeoutReached,
    #[error("Request failed")]
    RequestFailed,
}

#[wasm_bindgen]
impl JrpcQuery {
    #[wasm_bindgen(js_name = "onReceive")]
    pub fn on_receive(self, data: String) {
        let _ = self.tx.send(Ok(data));
    }

    #[wasm_bindgen(js_name = "onError")]
    pub fn on_error(self, _: JsValue) {
        let _ = self.tx.send(Err(JrpcError::RequestFailed));
    }

    #[wasm_bindgen(js_name = "onTimeout")]
    pub fn on_timeout(self) {
        let _ = self.tx.send(Err(JrpcError::TimeoutReached));
    }
}

#[async_trait]
impl nt::external::JrpcConnection for JrpcConnector {
    async fn post(&self, data: &str) -> Result<String> {
        let (tx, rx) = oneshot::channel();
        let query = JrpcQuery { tx };
        self.sender.send(data, query);
        Ok(rx.await.unwrap_or(Err(JrpcError::RequestFailed))?)
    }
}

#[wasm_bindgen(js_name = "keystoreStorageKey")]
pub fn keystore_storage_key() -> String {
    nt::core::keystore::KEYSTORE_STORAGE_KEY.to_owned()
}

#[wasm_bindgen(js_name = "accountsStorageKey")]
pub fn accounts_storage_key() -> String {
    nt::core::accounts_storage::ACCOUNTS_STORAGE_KEY.to_owned()
}
