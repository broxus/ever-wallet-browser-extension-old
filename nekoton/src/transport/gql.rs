use std::convert::TryInto;
use std::sync::Arc;

use anyhow::Result;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use nt::transport::{gql, Transport};

use super::{
    make_ton_wallet_init_data, make_transactions_list, IntoHandle, PromiseGenericContract,
    PromiseOptionFullContractState, PromiseTokenWallet, PromiseTonWallet, PromiseTonWalletInitData,
    PromiseTransactionsList, TransportError, TransportHandle,
};
use crate::external::{GqlConnectionImpl, GqlSender};
use crate::utils::*;

#[wasm_bindgen]
#[derive(Clone)]
pub struct GqlConnection {
    #[wasm_bindgen(skip)]
    pub inner: Arc<GqlConnectionImpl>,
}

#[wasm_bindgen]
impl GqlConnection {
    #[wasm_bindgen(constructor)]
    pub fn new(sender: GqlSender) -> GqlConnection {
        Self {
            inner: Arc::new(GqlConnectionImpl::new(sender)),
        }
    }

    #[wasm_bindgen(js_name = "subscribeToGenericContract")]
    pub fn subscribe_to_generic_contract_wallet(
        &self,
        address: &str,
        handler: crate::core::generic_contract::GenericContractSubscriptionHandlerImpl,
    ) -> Result<PromiseGenericContract, JsValue> {
        use crate::core::generic_contract::*;

        let address = parse_address(address)?;

        let transport = Arc::new(self.make_transport());
        let handler = Arc::new(GenericContractSubscriptionHandler::from(handler));

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = nt::core::generic_contract::GenericContract::subscribe(
                transport.clone() as Arc<dyn nt::transport::Transport>,
                address,
                handler,
            )
            .await
            .handle_error()?;

            Ok(JsValue::from(GenericContract::new(
                transport.into_handle(),
                wallet,
            )))
        })))
    }

    #[wasm_bindgen(js_name = "subscribeToTonWallet")]
    pub fn subscribe_to_main_wallet(
        &self,
        public_key: &str,
        contract_type: crate::core::ton_wallet::ContractType,
        handler: crate::core::ton_wallet::TonWalletSubscriptionHandlerImpl,
    ) -> Result<PromiseTonWallet, JsValue> {
        use crate::core::ton_wallet::*;

        let public_key = parse_public_key(&public_key)?;
        let contract_type = contract_type.try_into()?;

        let transport = Arc::new(self.make_transport());
        let handler = Arc::new(TonWalletSubscriptionHandler::from(handler));

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = nt::core::ton_wallet::TonWallet::subscribe(
                transport.clone() as Arc<dyn nt::transport::Transport>,
                public_key,
                contract_type,
                handler,
            )
            .await
            .handle_error()?;

            Ok(JsValue::from(TonWallet::new(
                transport.into_handle(),
                wallet,
            )))
        })))
    }

    #[wasm_bindgen(js_name = "subscribeToTonWalletByAddress")]
    pub fn subscribe_to_main_wallet_by_address(
        &self,
        address: &str,
        handler: crate::core::ton_wallet::TonWalletSubscriptionHandlerImpl,
    ) -> Result<PromiseTonWallet, JsValue> {
        use crate::core::ton_wallet::*;

        let address = parse_address(&address)?;

        let transport = Arc::new(self.make_transport());
        let handler = Arc::new(TonWalletSubscriptionHandler::from(handler));

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = nt::core::ton_wallet::TonWallet::subscribe_by_address(
                transport.clone() as Arc<dyn nt::transport::Transport>,
                address,
                handler,
            )
            .await
            .handle_error()?;

            Ok(JsValue::from(TonWallet::new(
                transport.into_handle(),
                wallet,
            )))
        })))
    }

    #[wasm_bindgen(js_name = "subscribeToTokenWallet")]
    pub fn subscribe_to_token_wallet(
        &self,
        owner: &str,
        root_token_contract: &str,
        handler: crate::core::token_wallet::TokenWalletSubscriptionHandlerImpl,
    ) -> Result<PromiseTokenWallet, JsValue> {
        use crate::core::token_wallet::*;

        let owner = parse_address(owner)?;
        let root_token_contract = parse_address(root_token_contract)?;

        let transport = Arc::new(self.make_transport());
        let handler = Arc::new(TokenWalletSubscriptionHandler::from(handler));

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = nt::core::token_wallet::TokenWallet::subscribe(
                transport.clone() as Arc<dyn nt::transport::Transport>,
                owner,
                root_token_contract,
                handler,
            )
            .await
            .handle_error()?;

            Ok(JsValue::from(TokenWallet::new(
                transport.into_handle(),
                wallet,
            )))
        })))
    }

    #[wasm_bindgen(js_name = "getTonWalletInitData")]
    pub fn get_ton_wallet_init_data(
        &self,
        address: &str,
    ) -> Result<PromiseTonWalletInitData, JsValue> {
        let address = parse_address(address)?;
        let transport = self.make_transport();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let (public_key, contract_type) = match transport
                .get_contract_state(&address)
                .await
                .handle_error()?
            {
                nt::transport::models::RawContractState::Exists(contract) => {
                    nt::core::ton_wallet::extract_wallet_init_data(&contract).handle_error()?
                }
                nt::transport::models::RawContractState::NotExists => {
                    return Err(TransportError::WalletNotDeployed).handle_error()
                }
            };
            Ok(make_ton_wallet_init_data(public_key, contract_type))
        })))
    }

    #[wasm_bindgen(js_name = "getLatestBlock")]
    pub fn get_latest_block(&self, address: &str) -> Result<PromiseLatestBlock, JsValue> {
        let address = parse_address(address)?;
        let transport = self.make_transport();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let latest_block = transport.get_latest_block(&address).await.handle_error()?;
            Ok(make_latest_block(latest_block))
        })))
    }

    #[wasm_bindgen(js_name = "waitForNextBlock")]
    pub fn wait_for_next_block(
        &self,
        current_block_id: String,
        address: &str,
        timeout: u32,
    ) -> Result<PromiseString, JsValue> {
        let address = parse_address(address)?;
        let transport = self.make_transport();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let next_block = transport
                .wait_for_next_block(
                    &current_block_id,
                    &address,
                    std::time::Duration::from_secs(timeout as u64),
                )
                .await
                .handle_error()?;
            Ok(JsValue::from(next_block))
        })))
    }

    #[wasm_bindgen(js_name = "getFullContractState")]
    pub fn get_full_account_state(
        &self,
        address: &str,
    ) -> Result<PromiseOptionFullContractState, JsValue> {
        let address = parse_address(address)?;
        let transport = self.make_transport();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            super::make_full_contract_state(
                transport
                    .get_contract_state(&address)
                    .await
                    .handle_error()?,
            )
        })))
    }

    #[wasm_bindgen(js_name = "getTransactions")]
    pub fn get_transactions(
        &self,
        address: &str,
        continuation: Option<crate::core::models::TransactionId>,
        limit: u8,
    ) -> Result<PromiseTransactionsList, JsValue> {
        use crate::core::models::*;

        let address = parse_address(address)?;
        let before_lt = continuation
            .map(parse_transaction_id)
            .transpose()?
            .map(|id| id.lt);
        let transport = self.make_transport();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let raw_transactions = transport
                .get_transactions(
                    address,
                    nt::core::models::TransactionId {
                        lt: before_lt.unwrap_or(u64::MAX),
                        hash: Default::default(),
                    },
                    limit,
                )
                .await
                .handle_error()?;
            Ok(make_transactions_list(raw_transactions).unchecked_into())
        })))
    }
}

impl GqlConnection {
    pub fn make_transport(&self) -> gql::GqlTransport {
        gql::GqlTransport::new(self.inner.clone())
    }
}

impl IntoHandle for Arc<gql::GqlTransport> {
    fn into_handle(self) -> TransportHandle {
        TransportHandle::GraphQl(self)
    }
}

#[wasm_bindgen(typescript_custom_section)]
const LATEST_BLOCK: &'static str = r#"
export type LatestBlock = {
    id: string,
    endLt: string,
    genUtime: number,
};
"#;

fn make_latest_block(latest_block: nt::transport::gql::LatestBlock) -> JsValue {
    ObjectBuilder::new()
        .set("id", latest_block.id)
        .set("endLt", latest_block.end_lt.to_string())
        .set("genUtime", latest_block.gen_utime)
        .build()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<LatestBlock>")]
    pub type PromiseLatestBlock;
}
