use ton_types::UInt256;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use nt::core::models;

#[wasm_bindgen]
pub struct Symbol {
    #[wasm_bindgen(skip)]
    pub inner: models::Symbol,
}

#[wasm_bindgen]
impl Symbol {
    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.inner.name.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn decimals(&self) -> u8 {
        self.inner.decimals
    }

    #[wasm_bindgen(getter, js_name = "rootTokenContract")]
    pub fn root_token_contract(&self) -> String {
        self.inner.root_token_contract.to_string()
    }
}

impl From<models::Symbol> for Symbol {
    fn from(inner: models::Symbol) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen]
pub struct AccountState {
    #[wasm_bindgen(skip)]
    pub inner: models::AccountState,
}

#[wasm_bindgen]
impl AccountState {
    #[wasm_bindgen(getter)]
    pub fn balance(&self) -> String {
        self.inner.balance.to_string()
    }

    #[wasm_bindgen(getter, js_name = "genTimings")]
    pub fn gen_timings(&self) -> GenTimings {
        self.inner.gen_timings.into()
    }

    #[wasm_bindgen(getter, js_name = "lastTransactionId")]
    pub fn last_transaction_id(&self) -> Option<LastTransactionId> {
        self.inner.last_transaction_id.map(|id| id.into())
    }

    #[wasm_bindgen(getter, js_name = "isDeployed")]
    pub fn is_deployed(&self) -> bool {
        self.inner.is_deployed
    }
}

impl From<models::AccountState> for AccountState {
    fn from(inner: models::AccountState) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen]
pub struct GenTimings {
    #[wasm_bindgen(skip)]
    pub gen_lt: u64,
    #[wasm_bindgen(skip)]
    pub gen_utime: u32,
}

#[wasm_bindgen]
impl GenTimings {
    #[wasm_bindgen(getter, js_name = "genLt")]
    pub fn gen_lt(&self) -> String {
        self.gen_lt.to_string()
    }

    #[wasm_bindgen(getter, js_name = "genUtime")]
    pub fn gen_utime(&self) -> u32 {
        self.gen_utime
    }
}

impl From<models::GenTimings> for GenTimings {
    fn from(t: models::GenTimings) -> GenTimings {
        match t {
            models::GenTimings::Unknown => GenTimings {
                gen_lt: 0,
                gen_utime: 0,
            },
            models::GenTimings::Known { gen_lt, gen_utime } => GenTimings { gen_lt, gen_utime },
        }
    }
}

#[wasm_bindgen]
pub struct PendingTransaction {
    #[wasm_bindgen(skip)]
    pub inner: models::PendingTransaction,
}

#[wasm_bindgen]
impl PendingTransaction {
    #[wasm_bindgen(getter)]
    pub fn src(&self) -> Option<String> {
        self.inner.src.as_ref().map(|src| src.to_string())
    }

    #[wasm_bindgen(getter, js_name = "bodyHash")]
    pub fn body_hash(&self) -> String {
        hex::encode(self.inner.body_hash.as_slice())
    }

    #[wasm_bindgen(getter, js_name = "expireAt")]
    pub fn expire_at(&self) -> u32 {
        self.inner.expire_at
    }
}

impl From<models::PendingTransaction> for PendingTransaction {
    fn from(inner: models::PendingTransaction) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen]
pub struct Transaction {
    #[wasm_bindgen(skip)]
    pub inner: models::Transaction,
}

#[wasm_bindgen]
impl Transaction {
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> TransactionId {
        self.inner.id.clone().into()
    }

    #[wasm_bindgen(getter, js_name = "prevTransactionId")]
    pub fn prev_transaction_id(&self) -> Option<TransactionId> {
        self.inner.prev_trans_id.clone().map(|id| id.into())
    }

    #[wasm_bindgen(getter, js_name = "createdAt")]
    pub fn created_at(&self) -> u32 {
        self.inner.created_at
    }

    #[wasm_bindgen(getter)]
    pub fn aborted(&self) -> bool {
        self.inner.aborted
    }

    #[wasm_bindgen(getter, js_name = "origStatus")]
    pub fn orig_status(&self) -> AccountStatus {
        convert_account_status(self.inner.orig_status.clone())
    }

    #[wasm_bindgen(getter, js_name = "endStatus")]
    pub fn end_status(&self) -> AccountStatus {
        convert_account_status(self.inner.end_status.clone())
    }

    #[wasm_bindgen(getter, js_name = "totalFees")]
    pub fn total_fees(&self) -> String {
        self.inner.total_fees.to_string()
    }

    #[wasm_bindgen(getter, js_name = "inMessage")]
    pub fn in_msg(&self) -> Message {
        self.inner.in_msg.clone().into()
    }

    #[wasm_bindgen(getter, js_name = "outMessages")]
    pub fn out_msgs(&self) -> MessagesList {
        self.inner
            .out_msgs
            .iter()
            .map(|msg| JsValue::from(Message::from(msg.clone())))
            .collect::<js_sys::Array>()
            .unchecked_into()
    }
}

impl From<models::Transaction> for Transaction {
    fn from(inner: models::Transaction) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Array<Message>")]
    pub type MessagesList;
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct Message {
    #[wasm_bindgen(skip)]
    pub inner: models::Message,
}

#[wasm_bindgen]
impl Message {
    #[wasm_bindgen(getter)]
    pub fn src(&self) -> Option<String> {
        self.inner.src.as_ref().map(|addr| addr.to_string())
    }

    #[wasm_bindgen(getter)]
    pub fn dst(&self) -> Option<String> {
        self.inner.dst.as_ref().map(|addr| addr.to_string())
    }

    #[wasm_bindgen(getter)]
    pub fn value(&self) -> String {
        self.inner.value.to_string()
    }

    #[wasm_bindgen(getter)]
    pub fn bounce(&self) -> bool {
        self.inner.bounce
    }

    #[wasm_bindgen(getter)]
    pub fn bounced(&self) -> bool {
        self.inner.bounced
    }

    #[wasm_bindgen(getter, js_name = "bodyHash")]
    pub fn body_hash(&self) -> Option<String> {
        self.inner
            .body
            .as_ref()
            .map(|body| hex::encode(body.hash.as_slice()))
    }
}

impl From<models::Message> for Message {
    fn from(inner: models::Message) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "'uninit' | 'frozen' | 'active' | 'nonexist'")]
    pub type AccountStatus;
}

fn convert_account_status(account_status: models::AccountStatus) -> AccountStatus {
    JsValue::from(match account_status {
        models::AccountStatus::Uninit => "uninit",
        models::AccountStatus::Frozen => "frozen",
        models::AccountStatus::Active => "active",
        models::AccountStatus::Nonexist => "nonexist",
    })
    .unchecked_into()
}

#[wasm_bindgen]
pub struct TransactionsBatchInfo {
    #[wasm_bindgen(skip)]
    pub inner: models::TransactionsBatchInfo,
}

#[wasm_bindgen]
impl TransactionsBatchInfo {
    #[wasm_bindgen(getter, js_name = "minLt")]
    pub fn min_lt(&self) -> String {
        self.inner.min_lt.to_string()
    }

    #[wasm_bindgen(getter, js_name = "maxLt")]
    pub fn max_lt(&self) -> String {
        self.inner.max_lt.to_string()
    }

    #[wasm_bindgen(getter, js_name = "batchType")]
    pub fn batch_type(&self) -> TransactionsBatchType {
        JsValue::from_str(if self.inner.old { "old" } else { "new" }).unchecked_into()
    }
}

impl From<models::TransactionsBatchInfo> for TransactionsBatchInfo {
    fn from(inner: models::TransactionsBatchInfo) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "'old' | 'new'")]
    pub type TransactionsBatchType;
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct LastTransactionId {
    #[wasm_bindgen(skip)]
    pub inner: models::LastTransactionId,
}

#[wasm_bindgen]
impl LastTransactionId {
    #[wasm_bindgen(getter, js_name = "isExact")]
    pub fn is_exact(&self) -> bool {
        matches!(&self.inner, models::LastTransactionId::Exact(_))
    }

    #[wasm_bindgen(getter, js_name = "lt")]
    pub fn lt(&self) -> String {
        match self.inner {
            models::LastTransactionId::Exact(id) => id.lt,
            models::LastTransactionId::Inexact { latest_lt } => latest_lt,
        }
        .to_string()
    }

    #[wasm_bindgen(getter, js_name = "hash")]
    pub fn hash(&self) -> Option<String> {
        match self.inner {
            models::LastTransactionId::Exact(id) => Some(id.hash.to_hex_string()),
            models::LastTransactionId::Inexact { .. } => None,
        }
    }
}

impl From<models::LastTransactionId> for LastTransactionId {
    fn from(inner: models::LastTransactionId) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct TransactionId {
    #[wasm_bindgen(skip)]
    pub lt: u64,
    #[wasm_bindgen(skip)]
    pub hash: UInt256,
}

#[wasm_bindgen]
impl TransactionId {
    #[wasm_bindgen(getter)]
    pub fn lt(&self) -> String {
        self.lt.to_string()
    }

    #[wasm_bindgen(getter)]
    pub fn hash(&self) -> String {
        hex::encode(self.hash.as_slice())
    }
}

impl From<models::TransactionId> for TransactionId {
    fn from(t: models::TransactionId) -> Self {
        Self {
            lt: t.lt,
            hash: t.hash,
        }
    }
}

pub fn convert_polling_method(s: models::PollingMethod) -> PollingMethod {
    JsValue::from(match s {
        models::PollingMethod::Manual => "manual",
        models::PollingMethod::Reliable => "reliable",
    })
    .unchecked_into()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "'manual' | 'reliable'")]
    pub type PollingMethod;

    #[wasm_bindgen(typescript_type = "'new' | 'old'")]
    pub type BatchType;
}
