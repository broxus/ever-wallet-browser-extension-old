pub mod gql;
pub mod jrpc;

use std::sync::Arc;

use anyhow::Result;
use ton_block::Serializable;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use nt::transport;

use crate::utils::*;

pub trait IntoHandle: Sized {
    fn into_handle(self) -> TransportHandle;
}

#[derive(Clone)]
pub enum TransportHandle {
    GraphQl(Arc<transport::gql::GqlTransport>),
    Adnl(Arc<dyn transport::Transport>),
}

impl TransportHandle {
    pub fn transport(&self) -> &dyn transport::Transport {
        match self {
            Self::GraphQl(transport) => transport.as_ref(),
            Self::Adnl(transport) => transport.as_ref(),
        }
    }

    pub fn info(&self) -> TransportInfo {
        make_transport_info(self.transport().info())
    }

    pub async fn get_block(&self, block_id: &str) -> Result<ton_block::Block, JsValue> {
        match self {
            Self::GraphQl(transport) => transport.get_block(block_id).await.handle_error(),
            _ => Err(TransportError::MethodNotSupported).handle_error(),
        }
    }
}

#[wasm_bindgen(typescript_custom_section)]
const TRANSPORT_INFO: &'static str = r#"
export type ReliableBahavior = 
    | 'intensive_polling'
    | 'block_walking';

export type TransportInfo = {
    maxTransactionsPerFetch: number;
    reliableBehavior: ReliableBehavior;
};
"#;

pub fn make_transport_info(data: transport::TransportInfo) -> TransportInfo {
    ObjectBuilder::new()
        .set("maxTransactionsPerFetch", data.max_transactions_per_fetch)
        .set("reliableBehavior", data.reliable_behavior.to_string())
        .build()
        .unchecked_into()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TransportInfo")]
    pub type TransportInfo;
}

#[wasm_bindgen(typescript_custom_section)]
const FULL_CONTRACT_STATE: &'static str = r#"
export type FullContractState = {
    balance: string;
    genTimings: GenTimings;
    lastTransactionId: LastTransactionId;
    isDeployed: boolean;
    boc: string;
};
"#;

pub fn make_full_contract_state(
    contract_state: nt::transport::models::RawContractState,
) -> Result<JsValue, JsValue> {
    use crate::core::models::*;

    match contract_state {
        nt::transport::models::RawContractState::Exists(state) => {
            let account_cell = state.account.serialize().handle_error()?;
            let boc = ton_types::serialize_toc(&account_cell)
                .map(base64::encode)
                .handle_error()?;

            Ok(ObjectBuilder::new()
                .set("balance", state.account.storage.balance.grams.0.to_string())
                .set("genTimings", make_gen_timings(state.timings))
                .set(
                    "lastTransactionId",
                    make_last_transaction_id(state.last_transaction_id),
                )
                .set(
                    "isDeployed",
                    matches!(
                        &state.account.storage.state,
                        ton_block::AccountState::AccountActive(_)
                    ),
                )
                .set("boc", boc)
                .build()
                .unchecked_into())
        }
        nt::transport::models::RawContractState::NotExists => Ok(JsValue::undefined()),
    }
}

#[derive(thiserror::Error, Debug)]
enum TransportError {
    #[error("Method not supported")]
    MethodNotSupported,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<GenericContract>")]
    pub type PromiseGenericContract;

    #[wasm_bindgen(typescript_type = "Promise<TonWallet>")]
    pub type PromiseTonWallet;

    #[wasm_bindgen(typescript_type = "Promise<TokenWallet>")]
    pub type PromiseTokenWallet;

    #[wasm_bindgen(typescript_type = "Promise<FullContractState | undefined>")]
    pub type PromiseOptionFullContractState;
}
