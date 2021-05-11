use std::str::FromStr;

use serde::Deserialize;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use nt::core::models;

use crate::utils::*;

#[wasm_bindgen(typescript_custom_section)]
const TRANSACTION_ADDITIONAL_INFO: &str = r#"
export type TransactionAdditionalInfo =
    | EnumItem<'comment', string>
    | EnumItem<'depool_on_round_complete', DePoolOnRoundCompleteNotification>
    | EnumItem<'depool_receive_answer', DePoolReceiveAnswerNotification>
    | EnumItem<'token_wallet_deployed', TokenWalletDeployedNotification>
    | EnumItem<'eth_event_status_changed', EthEventStatusChanged>
    | EnumItem<'ton_event_status_changed', TonEventStatusChanged>;
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TransactionAdditionalInfo")]
    pub type TransactionAdditionalInfo;
}

pub fn make_transaction_additional_info(
    data: models::TransactionAdditionalInfo,
) -> Option<TransactionAdditionalInfo> {
    let (ty, data) = match data {
        models::TransactionAdditionalInfo::Comment(comment) => ("comment", JsValue::from(comment)),
        models::TransactionAdditionalInfo::DePoolOnRoundComplete(notification) => (
            "depool_on_round_complete",
            make_depool_on_round_complete_notification(notification).unchecked_into(),
        ),
        models::TransactionAdditionalInfo::DePoolReceiveAnswer(notification) => (
            "depool_receive_answer",
            make_depool_receive_answer_notification(notification).unchecked_into(),
        ),
        models::TransactionAdditionalInfo::TokenWalletDeployed(notification) => (
            "token_wallet_deployed",
            make_token_wallet_deployment_notification(notification).unchecked_into(),
        ),
        models::TransactionAdditionalInfo::EthEventStatusChanged(status) => (
            "eth_event_status_changed",
            JsValue::from(status.to_string()),
        ),
        models::TransactionAdditionalInfo::TonEventStatusChanged(status) => (
            "ton_event_status_changed",
            JsValue::from(status.to_string()),
        ),
        _ => return None,
    };

    Some(
        ObjectBuilder::new()
            .set("type", ty)
            .set("data", data)
            .build()
            .unchecked_into(),
    )
}

#[wasm_bindgen(typescript_custom_section)]
const DEPOOL_ON_ROUND_COMPLETE_NOTIFICATION: &str = r#"
export type DePoolOnRoundCompleteNotification = {
    roundId: string,
    reward: string,
    ordinaryStake: string,
    vestingStake: string,
    lockStake: string,
    reinvest: boolean,
    reason: number,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "DePoolOnRoundCompleteNotification")]
    pub type DePoolOnRoundCompleteNotification;
}

pub fn make_depool_on_round_complete_notification(
    data: models::DePoolOnRoundCompleteNotification,
) -> DePoolOnRoundCompleteNotification {
    ObjectBuilder::new()
        .set("roundId", data.round_id.to_string())
        .set("reward", data.reward.to_string())
        .set("ordinaryStake", data.ordinary_stake.to_string())
        .set("vestingStake", data.vesting_stake.to_string())
        .set("lockStake", data.lock_stake.to_string())
        .set("reinvest", data.reinvest)
        .set("reason", data.reason)
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const DEPOOL_RECEIVE_ANSWER_NOTIFICATION: &str = r#"
export type DePoolReceiveAnswerNotification = {
    errorCode: string,
    // comment code, it is a string because of u64
    comment: string,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "DePoolReceiveAnswerNotification")]
    pub type DePoolReceiveAnswerNotification;
}

pub fn make_depool_receive_answer_notification(
    data: models::DePoolReceiveAnswerNotification,
) -> DePoolReceiveAnswerNotification {
    ObjectBuilder::new()
        .set("errorCode", data.error_code.to_string())
        .set("comment", data.comment.to_string())
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const TOKEN_WALLET_DEPLOYMENT_NOTIFICATION: &str = r#"
export type TokenWalletDeploymentNotification = {
    rootTokenContract: string,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TokenWalletDeploymentNotification")]
    pub type TokenWalletDeploymentNotification;
}

pub fn make_token_wallet_deployment_notification(
    data: models::TokenWalletDeployedNotification,
) -> TokenWalletDeploymentNotification {
    ObjectBuilder::new()
        .set("rootTokenContract", data.root_token_contract.to_string())
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const ETH_EVENT_STATUS: &str = r#"
export type EthEventStatus =
    | 'InProcess'
    | 'Confirmed'
    | 'Executed'
    | 'Rejected';
"#;

#[wasm_bindgen(typescript_custom_section)]
const TON_EVENT_STATUS: &str = r#"
export type TonEventStatus =
    | 'InProcess'
    | 'Confirmed'
    | 'Rejected';
"#;

#[wasm_bindgen(typescript_custom_section)]
const SYMBOL: &str = r#"
export type Symbol = {
    name: string,
    fullName: string,
    decimals: number,
    rootTokenContract: string,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Symbol")]
    pub type Symbol;
}

pub fn make_symbol(data: models::Symbol) -> Symbol {
    ObjectBuilder::new()
        .set("name", data.symbol)
        .set("fullName", data.name)
        .set("decimals", data.decimals)
        .set("rootTokenContract", data.root_token_contract.to_string())
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const ACCOUNT_STATE: &str = r#"
export type ContractState = {
    balance: string,
    genTimings: GenTimings,
    lastTransactionId?: LastTransactionId,
    isDeployed: boolean,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "AccountState")]
    pub type ContractState;
}

pub fn make_contract_state(data: models::ContractState) -> ContractState {
    ObjectBuilder::new()
        .set("balance", data.balance.to_string())
        .set("genTimings", make_gen_timings(data.gen_timings))
        .set(
            "lastTransactionId",
            data.last_transaction_id.map(make_last_transaction_id),
        )
        .set("isDeployed", data.is_deployed)
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const GEN_TIMINGS: &str = r#"
export type GenTimings = {
    genLt: string,
    genUtime: number,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "GenTimings")]
    pub type GenTimings;
}

pub fn make_gen_timings(data: models::GenTimings) -> GenTimings {
    let (gen_lt, gen_utime) = match data {
        models::GenTimings::Unknown => (0, 0),
        models::GenTimings::Known { gen_lt, gen_utime } => (gen_lt, gen_utime),
    };

    ObjectBuilder::new()
        .set("genLt", gen_lt.to_string())
        .set("genUtime", gen_utime)
        .build()
        .unchecked_into()
}

pub fn parse_gen_timings(data: GenTimings) -> Result<models::GenTimings, JsValue> {
    #[derive(Clone, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ParsedGenTimings {
        gen_lt: String,
        gen_utime: u32,
    }

    let ParsedGenTimings { gen_lt, gen_utime } =
        JsValue::into_serde::<ParsedGenTimings>(&data).handle_error()?;
    let gen_lt = u64::from_str(&gen_lt).handle_error()?;
    match (gen_lt, gen_utime) {
        (0, _) | (_, 0) => Ok(models::GenTimings::Unknown),
        (gen_lt, gen_utime) => Ok(models::GenTimings::Known { gen_lt, gen_utime }),
    }
}

#[wasm_bindgen(typescript_custom_section)]
const PENDING_TRANSACTION: &str = r#"
export type PendingTransaction = {
    src?: string,
    bodyHash: string,
    expireAt: number,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "PendingTransaction")]
    pub type PendingTransaction;
}

pub fn make_pending_transaction(data: models::PendingTransaction) -> PendingTransaction {
    ObjectBuilder::new()
        .set("src", data.src.as_ref().map(ToString::to_string))
        .set("bodyHash", data.body_hash.to_hex_string())
        .set("expireAt", data.expire_at)
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const TRANSACTION: &str = r#"
export type Transaction = {
    id: TransactionId,
    prevTransactionId?: TransactionId,
    createdAt: number,
    aborted: boolean,
    origStatus: AccountStatus,
    endStatus: AccountStatus,
    totalFees: string,
    inMessage: Message,
    outMessages: Message[],
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Transaction")]
    pub type Transaction;
}

pub fn make_transaction(data: models::Transaction) -> Transaction {
    ObjectBuilder::new()
        .set("id", make_transaction_id(data.id))
        .set(
            "prevTransactionId",
            data.prev_trans_id.map(make_transaction_id),
        )
        .set("createdAt", data.created_at)
        .set("aborted", data.aborted)
        .set("origStatus", make_account_status(data.orig_status))
        .set("endStatus", make_account_status(data.end_status))
        .set("totalFees", data.total_fees.to_string())
        .set("inMessage", make_message(data.in_msg))
        .set(
            "outMessages",
            data.out_msgs
                .into_iter()
                .map(make_message)
                .map(JsValue::from)
                .collect::<js_sys::Array>(),
        )
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const MESSAGE: &str = r#"
export type Message = {
    src?: string,
    dst?: string,
    value: string,
    bounce: boolean,
    bounced: boolean,
    body?: string,
    bodyHash?: string,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Message")]
    pub type Message;
}

pub fn make_message(data: models::Message) -> Message {
    let (body, body_hash) = if let Some(body) = data.body {
        (Some(body.data), Some(body.hash.to_hex_string()))
    } else {
        (None, None)
    };

    ObjectBuilder::new()
        .set("src", data.src.as_ref().map(ToString::to_string))
        .set("dst", data.dst.as_ref().map(ToString::to_string))
        .set("value", data.value.to_string())
        .set("bounce", data.bounce)
        .set("bounced", data.bounced)
        .set("body", body)
        .set("bodyHash", body_hash)
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const ACCOUNT_STATUS: &str = r#"
export type AccountStatus = 'uninit' | 'frozen' | 'active' | 'nonexist';
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "AccountStatus")]
    pub type AccountStatus;
}

fn make_account_status(data: models::AccountStatus) -> AccountStatus {
    JsValue::from(match data {
        models::AccountStatus::Uninit => "uninit",
        models::AccountStatus::Frozen => "frozen",
        models::AccountStatus::Active => "active",
        models::AccountStatus::Nonexist => "nonexist",
    })
    .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const TRANSACTIONS_BATCH_INFO: &str = r#"
export type TransactionsBatchInfo = {
    minLt: string,
    maxLt: string,
    batchType: TransactionsBatchType,
};

export type TransactionsBatchType = 'old' | 'new';
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TransactionsBatchInfo")]
    pub type TransactionsBatchInfo;

    #[wasm_bindgen(typescript_type = "TransactionsBatchType")]
    pub type TransactionsBatchType;
}

pub fn make_transactions_batch_info(data: models::TransactionsBatchInfo) -> TransactionsBatchInfo {
    ObjectBuilder::new()
        .set("minLt", data.min_lt.to_string())
        .set("maxLt", data.max_lt.to_string())
        .set("batchType", if data.old { "old" } else { "new" })
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const LAST_TRANSACTION_ID: &str = r#"
export type LastTransactionId = {
    isExact: boolean,
    lt: string,
    hash?: string,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "LastTransactionId")]
    pub type LastTransactionId;
}

pub fn make_last_transaction_id(data: models::LastTransactionId) -> LastTransactionId {
    let (lt, hash) = match data {
        models::LastTransactionId::Exact(id) => (id.lt, Some(id.hash.to_hex_string())),
        models::LastTransactionId::Inexact { latest_lt } => (latest_lt, None),
    };

    ObjectBuilder::new()
        .set("isExact", data.is_exact())
        .set("lt", lt.to_string())
        .set("hash", hash)
        .build()
        .unchecked_into()
}

pub fn parse_last_transaction_id(
    data: LastTransactionId,
) -> Result<models::LastTransactionId, JsValue> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ParsedLastTransactionId {
        is_exact: bool,
        lt: String,
        hash: Option<String>,
    }

    let ParsedLastTransactionId { is_exact, lt, hash } =
        JsValue::into_serde::<ParsedLastTransactionId>(&data).handle_error()?;
    let lt = u64::from_str(&lt).handle_error()?;

    Ok(match (is_exact, hash) {
        (true, Some(hash)) => {
            let hash = ton_types::UInt256::from_str(&hash).handle_error()?;
            models::LastTransactionId::Exact(models::TransactionId { lt, hash })
        }
        (false, None) => models::LastTransactionId::Inexact { latest_lt: lt },
        _ => return Err(ModelError::InvalidLastTransactionId).handle_error(),
    })
}

#[wasm_bindgen(typescript_custom_section)]
const TRANSACTION_ID: &str = r#"
export type TransactionId = {
    lt: string,
    hash: string,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TransactionId")]
    pub type TransactionId;
}

pub fn make_transaction_id(data: models::TransactionId) -> TransactionId {
    ObjectBuilder::new()
        .set("lt", data.lt.to_string())
        .set("hash", hex::encode(data.hash.as_slice()))
        .build()
        .unchecked_into()
}

pub fn make_polling_method(s: models::PollingMethod) -> PollingMethod {
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

    #[wasm_bindgen(typescript_type = "Promise<PendingTransaction>")]
    pub type PromisePendingTransaction;
}

#[derive(thiserror::Error, Debug)]
enum ModelError {
    #[error("Invalid last transaction id")]
    InvalidLastTransactionId,
}
