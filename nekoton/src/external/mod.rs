use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use anyhow::{anyhow, Result};
use async_trait::async_trait;
use futures::channel::oneshot;
use ton_api::ton;
use wasm_bindgen::prelude::*;

use nt::utils::*;

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

#[wasm_bindgen]
extern "C" {
    pub type TcpSender;

    #[wasm_bindgen(method)]
    pub fn send(this: &TcpSender, data: &[u8]);
}

unsafe impl Send for TcpSender {}
unsafe impl Sync for TcpSender {}

pub struct AdnlConnectionImpl {
    tx: Arc<TcpSender>,
    inner: Arc<Mutex<AdnlConnectionImplData>>,
}

impl AdnlConnectionImpl {
    pub fn new(tx: TcpSender) -> Self {
        Self {
            tx: Arc::new(tx),
            inner: Default::default(),
        }
    }

    pub fn init(self: Arc<Self>, key: &str) -> Result<TcpReceiver> {
        use nt::transport::adnl;

        let key = base64::decode(key).map_err(|_| anyhow!("Invalid key"))?;
        let key = if key.len() == 32 {
            // SAFETY: key length is always 32
            adnl::ExternalKey::from_public_key(unsafe { &*(key.as_ptr() as *const [u8; 32]) })
        } else {
            return Err(anyhow!("Invalid key"));
        };

        {
            let mut inner = self.inner.lock().trust_me();

            let (client_state, init_packet) = adnl::ClientState::init(&key);
            inner.state = AdnlConnectionState::WaitingInitialization(Some(client_state));
            self.tx.send(&init_packet);
        }

        Ok(TcpReceiver {
            inner: self.inner.clone(),
        })
    }
}

#[async_trait]
impl nt::external::AdnlConnection for AdnlConnectionImpl {
    async fn query(&self, request: ton::TLObject) -> AdnlResponse {
        let rx = {
            let mut inner = self.inner.lock().unwrap();

            let state = match &mut inner.state {
                AdnlConnectionState::Initialized(state) => state,
                _ => return Err(AdnlQueryError::Uninitialized.into()),
            };

            let nt::transport::adnl::Query { query_id, data } = state.build_query(&request);

            let (tx, rx) = oneshot::channel();
            inner.queries.insert(query_id, tx);

            self.tx.send(&data);

            rx
        };
        rx.await
            .unwrap_or_else(|_| Err(AdnlQueryError::ConnectionDropped.into()))
    }
}

pub struct AdnlConnectionImplData {
    state: AdnlConnectionState,
    queries: HashMap<nt::transport::adnl::QueryId, oneshot::Sender<AdnlResponse>>,
}

impl Default for AdnlConnectionImplData {
    fn default() -> Self {
        Self {
            state: AdnlConnectionState::Uninitialized,
            queries: Default::default(),
        }
    }
}

#[wasm_bindgen]
pub struct TcpReceiver {
    #[wasm_bindgen(skip)]
    pub inner: Arc<Mutex<AdnlConnectionImplData>>,
}

#[wasm_bindgen]
impl TcpReceiver {
    #[wasm_bindgen(js_name = "onReceive")]
    pub fn on_receive(&mut self, data: &mut [u8]) -> Result<(), JsValue> {
        let mut inner = self.inner.lock().trust_me();

        match &mut inner.state {
            AdnlConnectionState::Uninitialized
            | AdnlConnectionState::WaitingInitialization(None) => {
                Err(AdnlQueryError::Uninitialized).handle_error()
            }
            AdnlConnectionState::WaitingInitialization(state) => {
                let mut state = state.take().trust_me();
                state.handle_init_response(data);
                inner.state = AdnlConnectionState::Initialized(state);
                Ok(())
            }
            AdnlConnectionState::Initialized(state) => {
                let query = match state.handle_query(data).handle_error()? {
                    Some(query) => query,
                    None => return Ok(()),
                };

                let tx = match inner.queries.remove(&query.query_id.0) {
                    Some(tx) => tx,
                    None => return Ok(()),
                };

                let result: AdnlResponse =
                    ton_api::Deserializer::new(&mut std::io::Cursor::new(&query.answer.0))
                        .read_boxed::<ton::TLObject>()
                        .map_err(|_| AdnlQueryError::InvalidAnswerBody.into());

                let _ = tx.send(result);

                Ok(())
            }
        }
    }
}

type AdnlResponse = Result<ton::TLObject, anyhow::Error>;

#[derive(thiserror::Error, Debug)]
enum AdnlQueryError {
    #[error("Connection wasn't initialized")]
    Uninitialized,
    #[error("Connection dropped unexpectedly")]
    ConnectionDropped,
    #[error("Invalid answer body")]
    InvalidAnswerBody,
}

enum AdnlConnectionState {
    Uninitialized,
    WaitingInitialization(Option<nt::transport::adnl::ClientState>),
    Initialized(nt::transport::adnl::ClientState),
}
