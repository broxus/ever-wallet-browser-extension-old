use std::collections::HashMap;
use std::str::FromStr;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use futures::channel::oneshot;
use js_sys::{Array, Promise, Uint8Array};
use ton_api::ton;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::{future_to_promise, JsFuture};

use crate::utils::HandleError;

pub mod adnl;
pub mod core;
pub mod crypto;
mod utils;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    console_error_panic_hook::set_once();
    Ok(())
}

#[wasm_bindgen]
pub struct TonInterface {
    #[wasm_bindgen(skip)]
    pub inner: Arc<core::TonInterface>,
}

#[wasm_bindgen]
impl TonInterface {
    #[wasm_bindgen(constructor)]
    pub fn new(connection: AdnlConnection) -> TonInterface {
        let adnl_transport = core::AdnlTransport::new(Arc::new(connection));
        TonInterface {
            inner: Arc::new(core::TonInterface::new(Box::new(adnl_transport))),
        }
    }

    #[wasm_bindgen(js_name = "getLatestMasterchainBlock")]
    pub fn get_latest_masterchain_block(&self) -> Promise {
        let inner = self.inner.clone();

        future_to_promise(async move {
            let data = inner.get_masterchain_info().await.handle_error()?;

            Ok(JsValue::from(LastBlockIdExt {
                workchain: data.workchain,
                shard: data.shard,
                seqno: data.seqno,
                root_hash: data.root_hash,
                file_hash: data.file_hash,
            }))
        })
    }
}

#[wasm_bindgen]
extern "C" {
    pub type TcpSender;

    #[wasm_bindgen(method)]
    pub fn send(this: &TcpSender, data: &[u8]);
}

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

unsafe impl Send for TcpSender {}
unsafe impl Sync for TcpSender {}

#[async_trait]
impl core::AdnlConnection for AdnlConnection {
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
                let mut state = state.take().expect("Shouldn't fail");
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

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Array<Transaction>")]
    pub type TransactionsArray;
}

#[wasm_bindgen]
pub struct AccountId {
    #[wasm_bindgen(skip)]
    pub workchain: i8,
    #[wasm_bindgen(skip)]
    pub id: [u8; 32],
}

#[wasm_bindgen]
impl AccountId {
    #[wasm_bindgen]
    pub fn parse(address: &str) -> Result<AccountId, JsValue> {
        let address = ton_block::MsgAddressInt::from_str(address)
            .map_err(|_| "Invalid address")
            .handle_error()?;
        Ok(AccountId {
            workchain: address.workchain_id() as i8,
            id: ton_types::UInt256::from(address.address().get_bytestring(0)).into(),
        })
    }

    #[wasm_bindgen(getter)]
    pub fn workchain(&self) -> i8 {
        self.workchain
    }

    #[wasm_bindgen(getter)]
    pub fn id(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.id.as_mut_ptr(), self.id.len()) }
    }

    #[wasm_bindgen(js_name = "toString")]
    pub fn to_string(&self) -> String {
        format!("{}:{}", self.workchain, hex::encode(&self.id))
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct TransactionId {
    #[wasm_bindgen(skip)]
    pub lt: u64,
    #[wasm_bindgen(skip)]
    pub hash: [u8; 32],
}

#[wasm_bindgen]
impl TransactionId {
    #[wasm_bindgen(getter)]
    pub fn lt(&self) -> String {
        self.lt.to_string()
    }

    #[wasm_bindgen(getter)]
    pub fn hash(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.hash.as_mut_ptr(), self.hash.len()) }
    }

    #[wasm_bindgen(js_name = "toString")]
    pub fn to_string(&self) -> String {
        hex::encode(&self.hash)
    }
}

#[wasm_bindgen]
pub struct Transaction {
    #[wasm_bindgen(skip)]
    pub id: TransactionId,
    #[wasm_bindgen(skip)]
    pub prev_trans_id: Option<TransactionId>,
    #[wasm_bindgen(skip)]
    pub now: u32,
}

#[wasm_bindgen]
impl Transaction {
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> TransactionId {
        self.id.clone()
    }

    #[wasm_bindgen(getter, js_name = "previousTransactionId")]
    pub fn previous_transaction_id(&mut self) -> Option<TransactionId> {
        self.prev_trans_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn now(&self) -> u32 {
        self.now
    }
}

#[wasm_bindgen]
pub struct LastBlockIdExt {
    #[wasm_bindgen(skip)]
    pub workchain: i8,
    #[wasm_bindgen(skip)]
    pub shard: u64,
    #[wasm_bindgen(skip)]
    pub seqno: u32,
    #[wasm_bindgen(skip)]
    pub root_hash: [u8; 32],
    #[wasm_bindgen(skip)]
    pub file_hash: [u8; 32],
}

#[wasm_bindgen]
impl LastBlockIdExt {
    #[wasm_bindgen(getter)]
    pub fn workchain(&self) -> i8 {
        self.workchain
    }

    #[wasm_bindgen(getter)]
    pub fn shard(&self) -> String {
        self.shard.to_string()
    }

    #[wasm_bindgen(getter)]
    pub fn seqno(&self) -> u32 {
        self.seqno
    }

    #[wasm_bindgen(getter)]
    pub fn root_hash(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.root_hash.as_mut_ptr(), self.root_hash.len()) }
    }

    #[wasm_bindgen(getter)]
    pub fn file_hash(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.file_hash.as_mut_ptr(), self.file_hash.len()) }
    }
}

#[wasm_bindgen]
pub struct AccountState {
    #[wasm_bindgen(skip)]
    pub last_trans_id: TransactionId,
    #[wasm_bindgen(skip)]
    pub gen_lt: u64,
    #[wasm_bindgen(skip)]
    pub gen_utime: u32,
    #[wasm_bindgen(skip)]
    pub balance: u64,
}

#[wasm_bindgen]
impl AccountState {
    #[wasm_bindgen(getter, js_name = "lastTransactionId")]
    pub fn last_trans_id(&self) -> Option<TransactionId> {
        (self.last_trans_id.lt != 0).then(|| self.last_trans_id.clone())
    }

    #[wasm_bindgen(getter, js_name = "genLt")]
    pub fn gen_lt(&self) -> String {
        self.gen_lt.to_string()
    }

    #[wasm_bindgen(getter, js_name = "genUnixTime")]
    pub fn gen_utime(&self) -> u32 {
        self.gen_utime
    }

    #[wasm_bindgen(getter)]
    pub fn balance(&self) -> String {
        self.balance.to_string()
    }
}
