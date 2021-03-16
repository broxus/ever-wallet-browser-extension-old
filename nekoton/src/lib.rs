use std::cell::RefCell;
use std::collections::HashMap;
use std::str::FromStr;

use async_trait::async_trait;
use futures::channel::oneshot;
use js_sys::{Array, Uint8Array};
use pin_project_lite::pin_project;
use ton_api::ton;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use crate::utils::HandleError;

use self::adnl::Query;
use futures::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};

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
    pub inner: core::TonInterface,
}

#[wasm_bindgen]
impl TonInterface {
    #[wasm_bindgen(js_name = "fromAdnlConnection")]
    pub fn from_adnl_connection(connection: AdnlConnection) -> Result<TonInterface, JsValue> {
        let adnl_transport = core::AdnlTransport::new(connection);
        Ok(TonInterface {
            inner: core::TonInterface::new(adnl_transport),
        })
    }

    #[wasm_bindgen(js_name = "getLatestMasterchainBlock")]
    pub async fn get_latest_masterchain_block(&self) -> Result<LastBlockIdExt, JsValue> {
        let data = self.inner.get_masterchain_info().await.handle_error()?;
        Ok(LastBlockIdExt {
            workchain: data.workchain,
            shard: data.shard,
            seqno: data.seqno,
            root_hash: data.root_hash,
            file_hash: data.file_hash,
        })
    }
}

#[wasm_bindgen]
extern "C" {
    type TcpSender;

    #[wasm_bindgen(method)]
    async fn send(this: &TcpSender, data: &[u8]);
}

#[wasm_bindgen]
pub struct AdnlConnection {
    tx: Arc<TcpSender>,
    state: AdnlConnectionState,
    queries: RefCell<HashMap<adnl::QueryId, oneshot::Sender<ton::TLObject>>>,
}

// SAFETY: wasm is single-threaded
unsafe impl Send for AdnlConnection {}
unsafe impl Sync for AdnlConnection {}

unsafe impl Send for TcpSender {}
unsafe impl Sync for TcpSender {}

#[async_trait]
impl core::AdnlConnection for AdnlConnection {
    async fn query(&self, request: ton::TLObject) -> Result<ton::TLObject, anyhow::Error> {
        let (rx, data) = {
            let mut state = match &self.state {
                AdnlConnectionState::Initialized(state) => state.borrow_mut(),
                _ => return Err(QueryError::Uninitialized.into()),
            };

            let adnl::Query { query_id, data } = state.build_query(&request);

            let (tx, rx) = oneshot::channel();
            let mut queries = self.queries.borrow_mut();
            queries.insert(query_id, tx);

            (rx, data)
        };

        let tx: Arc<TcpSender> = Arc::clone(&self.tx);
        wasm_bindgen_futures::spawn_local(async move {
            tx.send(&data).await;
        });

        rx.await.map_err(|_| QueryError::ConnectionDropped.into())
    }
}

#[wasm_bindgen]
impl AdnlConnection {
    #[wasm_bindgen(constructor)]
    pub fn new(tx: TcpSender) -> AdnlConnection {
        Self {
            tx: Arc::new(tx),
            state: AdnlConnectionState::Uninitialized,
            queries: Default::default(),
        }
    }

    #[wasm_bindgen(js_name = "init")]
    pub async fn init(&mut self, key: &str) -> Result<(), JsValue> {
        let key = base64::decode(key)
            .map_err(|_| "Invalid key")
            .handle_error()?;
        let key = if key.len() == 32 {
            // SAFETY: key length is always 32
            adnl::ExternalKey::from_public_key(unsafe { &*(key.as_ptr() as *const [u8; 32]) })
        } else {
            return Err("Invalid key").handle_error();
        };

        let (state, init_packet) = adnl::ClientState::init(&key);
        self.state = AdnlConnectionState::WaitingInitialization(Some(state));
        self.tx.send(&init_packet).await;

        assert!(matches!(self.state, AdnlConnectionState::Initialized(_))); // TODO: remove if guaranteed
        Ok(())
    }

    #[wasm_bindgen(js_name = "onReceive")]
    pub fn on_receive(&mut self, data: &mut [u8]) -> Result<(), JsValue> {
        match &mut self.state {
            AdnlConnectionState::Uninitialized
            | AdnlConnectionState::WaitingInitialization(None) => {
                Err(QueryError::Uninitialized).handle_error()
            }
            AdnlConnectionState::WaitingInitialization(state) => {
                let mut state = state.take().expect("Shouldn't fail");
                state.handle_init_response(data);
                self.state = AdnlConnectionState::Initialized(RefCell::new(state));
                Ok(())
            }
            AdnlConnectionState::Initialized(state) => {
                log(&hex::encode(data));
                // TODO
                Ok(())
            }
        }
    }
}

enum AdnlConnectionState {
    Uninitialized,
    WaitingInitialization(Option<adnl::ClientState>),
    Initialized(RefCell<adnl::ClientState>),
}

#[derive(thiserror::Error, Debug)]
enum QueryError {
    #[error("Connection wasn't initialized")]
    Uninitialized,
    #[error("Connection dropped unexpectedly")]
    ConnectionDropped,
    #[error("Failed to send")]
    FailedToSend,
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
