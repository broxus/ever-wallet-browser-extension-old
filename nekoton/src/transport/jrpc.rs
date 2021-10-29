use std::convert::TryInto;
use std::sync::Arc;

use anyhow::Result;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use nt::transport::jrpc;
use nt::transport::Transport;

use super::{
    make_root_token_contract_details, make_ton_wallet_init_data, make_transactions_list,
    IntoHandle, PromiseGenericContract, PromiseOptionFullContractState,
    PromiseRootTokenContractDetails, PromiseTokenWallet, PromiseTonWallet,
    PromiseTonWalletInitData, PromiseTransactionsList, TransportError, TransportHandle,
};
use crate::core::token_wallet::RootTokenContractDetailsWithAddress;
use crate::external::{JrpcConnector, JrpcSender};
use crate::utils::*;

#[wasm_bindgen]
pub struct JrpcConnection {
    #[wasm_bindgen(skip)]
    pub inner: Arc<JrpcConnector>,
    #[wasm_bindgen(skip)]
    pub clock: Arc<nt_utils::ClockWithOffset>,
}

#[wasm_bindgen]
impl JrpcConnection {
    #[wasm_bindgen(constructor)]
    pub fn new(clock: &ClockWithOffset, sender: JrpcSender) -> Self {
        Self {
            inner: Arc::new(JrpcConnector::new(sender)),
            clock: clock.clone_inner(),
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

        let clock = self.clock.clone();
        let transport = Arc::new(self.make_transport());
        let handler = Arc::new(GenericContractSubscriptionHandler::from(handler));

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = nt::core::generic_contract::GenericContract::subscribe(
                clock,
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

    #[wasm_bindgen(js_name = "subscribeToTonWalletByAddress")]
    pub fn subscribe_to_main_wallet_by_address(
        &self,
        address: &str,
        handler: crate::core::ton_wallet::TonWalletSubscriptionHandlerImpl,
    ) -> Result<PromiseTonWallet, JsValue> {
        use crate::core::ton_wallet::*;

        let address = parse_address(address)?;

        let clock = self.clock.clone();
        let transport = Arc::new(self.make_transport());
        let handler = Arc::new(TonWalletSubscriptionHandler::from(handler));

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = nt::core::ton_wallet::TonWallet::subscribe_by_address(
                clock,
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

    #[wasm_bindgen(js_name = "subscribeToTonWallet")]
    pub fn subscribe_to_main_wallet(
        &self,
        public_key: &str,
        contract_type: crate::core::ton_wallet::ContractType,
        workchain: i8,
        handler: crate::core::ton_wallet::TonWalletSubscriptionHandlerImpl,
    ) -> Result<PromiseTonWallet, JsValue> {
        use crate::core::ton_wallet::*;

        let public_key = parse_public_key(public_key)?;
        let contract_type = contract_type.try_into()?;

        let clock = self.clock.clone();
        let transport = Arc::new(self.make_transport());
        let handler = Arc::new(TonWalletSubscriptionHandler::from(handler));

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = nt::core::ton_wallet::TonWallet::subscribe(
                clock,
                transport.clone() as Arc<dyn nt::transport::Transport>,
                workchain,
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

        let clock = self.clock.clone();
        let transport = Arc::new(self.make_transport());
        let handler = Arc::new(TokenWalletSubscriptionHandler::from(handler));

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = nt::core::token_wallet::TokenWallet::subscribe(
                clock,
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

        let clock = self.clock.clone();
        let transport = self.make_transport();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let contract = match transport
                .get_contract_state(&address)
                .await
                .handle_error()?
            {
                nt::transport::models::RawContractState::Exists(contract) => contract,
                nt::transport::models::RawContractState::NotExists => {
                    return Err(TransportError::WalletNotDeployed).handle_error()
                }
            };

            let (public_key, wallet_type) =
                nt::core::ton_wallet::extract_wallet_init_data(&contract).handle_error()?;
            let custodians = nt::core::ton_wallet::get_wallet_custodians(
                clock.as_ref(),
                &contract,
                &public_key,
                wallet_type,
            )
            .handle_error()?;

            Ok(make_ton_wallet_init_data(
                public_key,
                wallet_type,
                address.workchain_id() as i8,
                custodians,
            ))
        })))
    }

    #[wasm_bindgen(js_name = "getTokenRootDetails")]
    pub fn get_token_root_details(
        &self,
        root_token_contract: &str,
        owner_address: &str,
    ) -> Result<RootTokenContractDetailsWithAddress, JsValue> {
        let root_token_contract = parse_address(root_token_contract)?;
        let owner = parse_address(owner_address)?;

        let clock = self.clock.clone();
        let transport = self.make_transport();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            crate::core::token_wallet::get_token_root_details_with_user_token_wallet(
                clock.as_ref(),
                &transport,
                &root_token_contract,
                &owner,
            )
            .await
            .map(JsCast::unchecked_into)
        })))
    }

    #[wasm_bindgen(js_name = "getTokenWalletBalance")]
    pub fn get_token_wallet_balance(&self, token_wallet: &str) -> Result<PromiseString, JsValue> {
        let token_wallet = parse_address(token_wallet)?;
        let clock = self.clock.clone();
        let transport = self.make_transport();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            crate::core::token_wallet::get_token_wallet_balance(
                clock.as_ref(),
                &transport,
                &token_wallet,
            )
            .await
            .map(JsValue::from)
            .map(JsCast::unchecked_into)
        })))
    }

    #[wasm_bindgen(js_name = "getTokenRootDetailsFromTokenWallet")]
    pub fn get_token_root_details_from_token_wallet(
        &self,
        token_wallet_address: &str,
    ) -> Result<PromiseRootTokenContractDetails, JsValue> {
        let token_wallet_address = parse_address(token_wallet_address)?;
        let clock = self.clock.clone();
        let transport = self.make_transport();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let (address, details) =
                nt::core::token_wallet::get_token_root_details_from_token_wallet(
                    clock.as_ref(),
                    &transport,
                    &token_wallet_address,
                )
                .await
                .handle_error()?;
            Ok(make_root_token_contract_details(address, details))
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
        let transport = self.make_transport();
        let from = match continuation {
            Some(continuation) => parse_transaction_id(continuation)?,
            None => nt_abi::TransactionId {
                lt: u64::MAX,
                hash: Default::default(),
            },
        };

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let transactions = transport
                .get_transactions(address, from, limit)
                .await
                .handle_error()?;

            Ok(make_transactions_list(transactions).unchecked_into())
        })))
    }
}

impl JrpcConnection {
    pub fn make_transport(&self) -> jrpc::JrpcTransport {
        jrpc::JrpcTransport::new(self.inner.clone())
    }
}

impl IntoHandle for Arc<jrpc::JrpcTransport> {
    fn into_handle(self) -> TransportHandle {
        TransportHandle::Adnl(self as Arc<dyn Transport>)
    }
}
