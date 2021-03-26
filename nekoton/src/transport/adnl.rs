use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use futures::channel::oneshot;
use ton_api::ton;
use wasm_bindgen::prelude::*;

use libnekoton::transport::adnl;
use libnekoton::utils::*;

use crate::utils::*;

#[wasm_bindgen]
extern "C" {
    pub type TcpSender;

    #[wasm_bindgen(method)]
    pub fn send(this: &TcpSender, data: &[u8]);
}

unsafe impl Send for TcpSender {}
unsafe impl Sync for TcpSender {}

#[wasm_bindgen]
pub struct AdnlConnection {
    #[wasm_bindgen(skip)]
    pub inner: Arc<Mutex<AdnlConnectionImpl>>,
}

type AdnlResponse = Result<ton::TLObject, anyhow::Error>;

pub struct AdnlConnectionImpl {
    tx: Arc<TcpSender>,
    state: AdnlConnectionState,
    queries: HashMap<adnl::QueryId, oneshot::Sender<AdnlResponse>>,
}

#[async_trait]
impl adnl::AdnlConnection for AdnlConnection {
    async fn query(&self, request: ton::TLObject) -> AdnlResponse {
        let rx = {
            let mut inner = self.inner.lock().unwrap();

            let state = match &mut inner.state {
                AdnlConnectionState::Initialized(state) => state,
                _ => return Err(QueryError::Uninitialized.into()),
            };

            let adnl::Query { query_id, data } = state.build_query(&request);

            let (tx, rx) = oneshot::channel();
            inner.queries.insert(query_id, tx);

            inner.tx.send(&data);

            rx
        };
        rx.await
            .unwrap_or_else(|_| Err(QueryError::ConnectionDropped.into()))
    }
}

#[wasm_bindgen]
impl AdnlConnection {
    #[wasm_bindgen(constructor)]
    pub fn new(tx: TcpSender) -> AdnlConnection {
        Self {
            inner: Arc::new(Mutex::new(AdnlConnectionImpl {
                tx: Arc::new(tx),
                state: AdnlConnectionState::Uninitialized,
                queries: Default::default(),
            })),
        }
    }

    #[wasm_bindgen(js_name = "init")]
    pub fn init(&mut self, key: &str) -> Result<TcpReceiver, JsValue> {
        let key = base64::decode(key)
            .map_err(|_| "Invalid key")
            .handle_error()?;
        let key = if key.len() == 32 {
            // SAFETY: key length is always 32
            adnl::ExternalKey::from_public_key(unsafe { &*(key.as_ptr() as *const [u8; 32]) })
        } else {
            return Err("Invalid key").handle_error();
        };

        {
            let mut inner = self.inner.lock().unwrap();

            let (state, init_packet) = adnl::ClientState::init(&key);
            inner.state = AdnlConnectionState::WaitingInitialization(Some(state));
            inner.tx.send(&init_packet);
        }

        Ok(TcpReceiver {
            inner: self.inner.clone(),
        })
    }
}

#[wasm_bindgen]
pub struct TcpReceiver {
    #[wasm_bindgen(skip)]
    pub inner: Arc<Mutex<AdnlConnectionImpl>>,
}

#[wasm_bindgen]
impl TcpReceiver {
    #[wasm_bindgen(js_name = "onReceive")]
    pub fn on_receive(&mut self, data: &mut [u8]) -> Result<(), JsValue> {
        let mut inner = self.inner.lock().unwrap();

        match &mut inner.state {
            AdnlConnectionState::Uninitialized
            | AdnlConnectionState::WaitingInitialization(None) => {
                Err(QueryError::Uninitialized).handle_error()
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
                        .map_err(|_| QueryError::InvalidAnswerBody.into());

                let _ = tx.send(result);

                Ok(())
            }
        }
    }
}

enum AdnlConnectionState {
    Uninitialized,
    WaitingInitialization(Option<adnl::ClientState>),
    Initialized(adnl::ClientState),
}

#[derive(thiserror::Error, Debug)]
enum QueryError {
    #[error("Connection wasn't initialized")]
    Uninitialized,
    #[error("Connection dropped unexpectedly")]
    ConnectionDropped,
    #[error("Invalid answer body")]
    InvalidAnswerBody,
}
