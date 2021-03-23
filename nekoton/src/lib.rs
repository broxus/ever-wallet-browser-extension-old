pub mod crypto;
mod helpers;
mod storage;
mod transport;
mod utils;

use std::str::FromStr;
use std::sync::Arc;

use js_sys::{Promise, Uint8Array};
use libnekoton::core;
use libnekoton::transport::{adnl, gql};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::future_to_promise;

use crate::transport::adnl::AdnlConnection;
use crate::transport::gql::GqlConnection;
use crate::utils::*;

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

impl TonInterface {
    fn new(transport: Box<dyn libnekoton::transport::Transport>) -> Self {
        TonInterface {
            inner: Arc::new(core::TonInterface::new(transport)),
        }
    }
}

#[wasm_bindgen]
impl TonInterface {
    #[wasm_bindgen(js_name = "overAdnl")]
    pub fn over_adnl(connection: AdnlConnection) -> TonInterface {
        TonInterface::new(Box::new(adnl::AdnlTransport::new(Arc::new(connection))))
    }

    #[wasm_bindgen(js_name = "overGraphQL")]
    pub fn over_gql(connection: &GqlConnection) -> TonInterface {
        TonInterface::new(Box::new(connection.make_transport()))
    }

    #[wasm_bindgen(js_name = "getAccountState")]
    pub fn get_account_state(&self) -> Promise {
        let _inner = self.inner.clone();

        future_to_promise(async move {
            // let data = inner.get_masterchain_info().await.handle_error()?;

            // Ok(JsValue::from(LastBlockIdExt {
            //     workchain: data.workchain,
            //     shard: data.shard,
            //     seqno: data.seqno,
            //     root_hash: data.root_hash,
            //     file_hash: data.file_hash,
            // }))

            Ok(JsValue::from(123))
        })
    }
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
