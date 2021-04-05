pub mod wallet;

use std::convert::TryFrom;
use std::str::FromStr;

use ton_types::UInt256;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use libnekoton::core::{self, ton_wallet};

use crate::utils::*;

#[wasm_bindgen]
pub struct Symbol {
    #[wasm_bindgen(skip)]
    pub inner: core::models::Symbol,
}

#[wasm_bindgen]
impl Symbol {
    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.inner.name.clone()
    }

    #[wasm_bindgen(getter, js_name = "rootTokenContract")]
    pub fn root_token_contract(&self) -> String {
        self.inner.root_token_contract.to_string()
    }
}

impl From<core::models::Symbol> for Symbol {
    fn from(inner: core::models::Symbol) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen(typescript_custom_section)]
const CONTRACT_TYPE: &'static str = r#"
export type ContractType = 
    | 'SafeMultisigWallet'
    | 'SafeMultisigWallet24h'
    | 'SetcodeMultisigWallet'
    | 'SurfWallet'
    | 'WalletV3';
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "ContractType")]
    pub type ContractType;
}

impl TryFrom<ContractType> for ton_wallet::ContractType {
    type Error = JsValue;

    fn try_from(value: ContractType) -> Result<Self, Self::Error> {
        let contract_type = JsValue::from(value)
            .as_string()
            .ok_or_else(|| JsValue::from_str("String with contract type name expected"))?;

        ton_wallet::ContractType::from_str(&contract_type).handle_error()
    }
}

impl From<ton_wallet::ContractType> for ContractType {
    fn from(c: ton_wallet::ContractType) -> Self {
        JsValue::from(c.to_string()).unchecked_into()
    }
}

#[wasm_bindgen]
pub struct AccountState {
    #[wasm_bindgen(skip)]
    pub inner: core::models::AccountState,
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

impl From<core::models::AccountState> for AccountState {
    fn from(inner: core::models::AccountState) -> Self {
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

impl From<core::models::GenTimings> for GenTimings {
    fn from(t: core::models::GenTimings) -> GenTimings {
        match t {
            core::models::GenTimings::Unknown => GenTimings {
                gen_lt: 0,
                gen_utime: 0,
            },
            core::models::GenTimings::Known { gen_lt, gen_utime } => {
                GenTimings { gen_lt, gen_utime }
            }
        }
    }
}

#[wasm_bindgen]
pub struct PendingTransaction {
    #[wasm_bindgen(skip)]
    pub inner: core::models::PendingTransaction,
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

impl From<core::models::PendingTransaction> for PendingTransaction {
    fn from(inner: core::models::PendingTransaction) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen]
pub struct Transaction {
    #[wasm_bindgen(skip)]
    pub inner: core::models::Transaction,
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

impl From<core::models::Transaction> for Transaction {
    fn from(inner: core::models::Transaction) -> Self {
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
    pub inner: core::models::Message,
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
}

impl From<core::models::Message> for Message {
    fn from(inner: core::models::Message) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "'uninit' | 'frozen' | 'active' | 'nonexist'")]
    pub type AccountStatus;
}

fn convert_account_status(account_status: core::models::AccountStatus) -> AccountStatus {
    JsValue::from(match account_status {
        core::models::AccountStatus::Uninit => "uninit",
        core::models::AccountStatus::Frozen => "frozen",
        core::models::AccountStatus::Active => "active",
        core::models::AccountStatus::Nonexist => "nonexist",
    })
    .unchecked_into()
}

#[wasm_bindgen]
pub struct TransactionsBatchInfo {
    #[wasm_bindgen(skip)]
    pub inner: core::models::TransactionsBatchInfo,
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

impl From<core::models::TransactionsBatchInfo> for TransactionsBatchInfo {
    fn from(inner: core::models::TransactionsBatchInfo) -> Self {
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
    pub inner: core::models::LastTransactionId,
}

#[wasm_bindgen]
impl LastTransactionId {
    #[wasm_bindgen(getter, js_name = "isExact")]
    pub fn is_exact(&self) -> bool {
        matches!(&self.inner, core::models::LastTransactionId::Exact(_))
    }

    #[wasm_bindgen(getter, js_name = "lt")]
    pub fn lt(&self) -> String {
        match self.inner {
            core::models::LastTransactionId::Exact(id) => id.lt,
            core::models::LastTransactionId::Inexact { latest_lt } => latest_lt,
        }
        .to_string()
    }

    #[wasm_bindgen(getter, js_name = "hash")]
    pub fn hash(&self) -> Option<String> {
        match self.inner {
            core::models::LastTransactionId::Exact(id) => Some(id.hash.to_hex_string()),
            core::models::LastTransactionId::Inexact { .. } => None,
        }
    }
}

impl From<core::models::LastTransactionId> for LastTransactionId {
    fn from(inner: core::models::LastTransactionId) -> Self {
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

impl From<core::models::TransactionId> for TransactionId {
    fn from(t: core::models::TransactionId) -> Self {
        Self {
            lt: t.lt,
            hash: t.hash,
        }
    }
}

pub fn convert_polling_method(s: core::models::PollingMethod) -> PollingMethod {
    JsValue::from(match s {
        core::models::PollingMethod::Manual => "manual",
        core::models::PollingMethod::Reliable => "reliable",
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
