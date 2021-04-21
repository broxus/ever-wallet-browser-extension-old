use std::convert::{TryFrom, TryInto};
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use nt::core::ton_wallet;
use nt::utils::*;

use super::PromiseLatestBlock;
use crate::utils::*;

#[wasm_bindgen]
pub struct TonWallet {
    #[wasm_bindgen(skip)]
    pub address: String,
    #[wasm_bindgen(skip)]
    pub public_key: String,
    #[wasm_bindgen(skip)]
    pub contract_type: ton_wallet::ContractType,
    #[wasm_bindgen(skip)]
    pub details: ton_wallet::TonWalletDetails,
    #[wasm_bindgen(skip)]
    pub inner: Arc<TonWalletImpl>,
}

impl TonWallet {
    pub fn new(
        transport: Arc<nt::transport::gql::GqlTransport>,
        wallet: ton_wallet::TonWallet,
    ) -> Self {
        Self {
            address: wallet.address().to_string(),
            public_key: hex::encode(wallet.public_key().as_bytes()),
            contract_type: wallet.contract_type(),
            details: wallet.details(),
            inner: Arc::new(TonWalletImpl {
                transport,
                wallet: Mutex::new(wallet),
            }),
        }
    }
}

#[wasm_bindgen]
impl TonWallet {
    #[wasm_bindgen(getter, js_name = "address")]
    pub fn address(&self) -> String {
        self.address.clone()
    }

    #[wasm_bindgen(getter, js_name = "publicKey")]
    pub fn public_key(&self) -> String {
        self.public_key.clone()
    }

    #[wasm_bindgen(getter, js_name = "contractType")]
    pub fn contract_type(&self) -> ContractType {
        self.contract_type.into()
    }

    #[wasm_bindgen(getter, js_name = "details")]
    pub fn details(&self) -> TonWalletDetails {
        make_ton_wallet_details(self.details)
    }

    #[wasm_bindgen(js_name = "accountState")]
    pub fn account_state(&self) -> crate::core::models::AccountState {
        let inner = self.inner.wallet.lock().trust_me();
        crate::core::models::make_account_state(inner.account_state().clone())
    }

    #[wasm_bindgen(js_name = "prepareDeploy")]
    pub fn prepare_deploy(&self, timeout: u32) -> Result<crate::crypto::UnsignedMessage, JsValue> {
        let wallet = self.inner.wallet.lock().trust_me();

        let inner = wallet
            .prepare_deploy(nt::core::models::Expiration::Timeout(timeout))
            .handle_error()?;
        Ok(crate::crypto::UnsignedMessage { inner })
    }

    #[wasm_bindgen(js_name = "prepareTransfer")]
    pub fn prepare_transfer(
        &self,
        current_state: &ContractState,
        dest: &str,
        amount: &str,
        bounce: bool,
        body: &str,
        timeout: u32,
    ) -> Result<Option<crate::crypto::UnsignedMessage>, JsValue> {
        let dest = parse_address(dest)?;
        let amount = u64::from_str(amount).handle_error()?;
        let body = if !body.is_empty() {
            Some(parse_slice(body)?)
        } else {
            None
        };

        let wallet = self.inner.wallet.lock().unwrap();

        Ok(
            match wallet
                .prepare_transfer(
                    &current_state.inner,
                    dest,
                    amount,
                    bounce,
                    body,
                    nt::core::models::Expiration::Timeout(timeout),
                )
                .handle_error()?
            {
                ton_wallet::TransferAction::Sign(inner) => {
                    Some(crate::crypto::UnsignedMessage { inner })
                }
                ton_wallet::TransferAction::DeployFirst => None,
            },
        )
    }

    #[wasm_bindgen(js_name = "getContractState")]
    pub fn get_contract_state(&self) -> PromiseOptionContractState {
        use nt::transport::models;
        use nt::transport::Transport;

        let address = self.inner.wallet.lock().trust_me().address().clone();
        let transport = self.inner.transport.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let contract_state = transport
                .get_contract_state(&address)
                .await
                .handle_error()?;

            Ok(match contract_state {
                models::ContractState::Exists(state) => JsValue::from(ContractState {
                    inner: state.account,
                }),
                models::ContractState::NotExists => JsValue::undefined(),
            })
        }))
    }

    #[wasm_bindgen(js_name = "estimateFees")]
    pub fn estimate_fees(
        &self,
        signed_message: crate::crypto::JsSignedMessage,
    ) -> Result<PromiseString, JsValue> {
        let inner = self.inner.clone();
        let message = crate::crypto::parse_signed_message(signed_message)?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let mut wallet = inner.wallet.lock().trust_me();

            let res = wallet.estimate_fees(&message.boc).await.handle_error()?;
            Ok(JsValue::from(res.to_string()))
        })))
    }

    #[wasm_bindgen(js_name = "sendMessage")]
    pub fn send_message(
        &self,
        message: crate::crypto::JsSignedMessage,
    ) -> Result<PromisePendingTransaction, JsValue> {
        let inner = self.inner.clone();
        let message = crate::crypto::parse_signed_message(message)?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let mut wallet = inner.wallet.lock().unwrap();

            let pending_transaction = wallet
                .send(&message.boc, message.expire_at)
                .await
                .handle_error()?;

            Ok(JsValue::from(
                crate::core::models::make_pending_transaction(pending_transaction),
            ))
        })))
    }

    #[wasm_bindgen(js_name = "getLatestBlock")]
    pub fn get_latest_block(&self) -> PromiseLatestBlock {
        let address = self.inner.wallet.lock().trust_me().address().clone();
        let transport = self.inner.transport.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let latest_block = transport.get_latest_block(&address).await.handle_error()?;
            Ok(super::make_latest_block(latest_block))
        }))
    }

    #[wasm_bindgen(js_name = "waitForNextBlock")]
    pub fn wait_for_next_block(&self, current: String, timeout: u32) -> PromiseString {
        let address = self.inner.wallet.lock().trust_me().address().clone();
        let transport = self.inner.transport.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let next_block = transport
                .wait_for_next_block(&current, &address, Duration::from_secs(timeout as u64))
                .await
                .handle_error()?;
            Ok(JsValue::from(next_block))
        }))
    }

    #[wasm_bindgen(js_name = "refresh")]
    pub fn refresh(&mut self) -> PromiseVoid {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let mut wallet = inner.wallet.lock().trust_me();

            wallet.refresh().await.handle_error()?;
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(js_name = "handleBlock")]
    pub fn handle_block(&mut self, block_id: String) -> PromiseVoid {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let block = inner.transport.get_block(&block_id).await.handle_error()?;

            let mut wallet = inner.wallet.lock().trust_me();
            wallet.handle_block(&block).await.handle_error()?;

            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(js_name = "preloadTransactions")]
    pub fn preload_transactions(&mut self, lt: &str, hash: &str) -> Result<PromiseVoid, JsValue> {
        let from = nt::core::models::TransactionId {
            lt: u64::from_str(&lt).handle_error()?,
            hash: ton_types::UInt256::from_str(hash).handle_error()?,
        };

        let inner = self.inner.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let mut wallet = inner.wallet.lock().trust_me();

            wallet.preload_transactions(from).await.handle_error()?;
            Ok(JsValue::undefined())
        })))
    }

    #[wasm_bindgen(getter, js_name = "pollingMethod")]
    pub fn polling_method(&self) -> crate::core::models::PollingMethod {
        crate::core::models::make_polling_method(
            self.inner.wallet.lock().trust_me().polling_method(),
        )
    }
}

pub struct TonWalletImpl {
    transport: Arc<nt::transport::gql::GqlTransport>,
    wallet: Mutex<ton_wallet::TonWallet>,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = "TonWalletSubscriptionHandler")]
    pub type TonWalletSubscriptionHandlerImpl;

    #[wasm_bindgen(method, js_name = "onMessageSent")]
    pub fn on_message_sent(
        this: &TonWalletSubscriptionHandlerImpl,
        pending_transaction: crate::core::models::PendingTransaction,
        transaction: Option<crate::core::models::Transaction>,
    );

    #[wasm_bindgen(method, js_name = "onMessageExpired")]
    pub fn on_message_expired(
        this: &TonWalletSubscriptionHandlerImpl,
        pending_transaction: crate::core::models::PendingTransaction,
    );

    #[wasm_bindgen(method, js_name = "onStateChanged")]
    pub fn on_state_changed(
        this: &TonWalletSubscriptionHandlerImpl,
        new_state: crate::core::models::AccountState,
    );

    #[wasm_bindgen(method, js_name = "onTransactionsFound")]
    pub fn on_transactions_found(
        this: &TonWalletSubscriptionHandlerImpl,
        transactions: TransactionsList,
        batch_info: crate::core::models::TransactionsBatchInfo,
    );
}

unsafe impl Send for TonWalletSubscriptionHandlerImpl {}

unsafe impl Sync for TonWalletSubscriptionHandlerImpl {}

pub struct TonWalletSubscriptionHandler {
    inner: TonWalletSubscriptionHandlerImpl,
}

impl From<TonWalletSubscriptionHandlerImpl> for TonWalletSubscriptionHandler {
    fn from(inner: TonWalletSubscriptionHandlerImpl) -> Self {
        Self { inner }
    }
}

impl ton_wallet::TonWalletSubscriptionHandler for TonWalletSubscriptionHandler {
    fn on_message_sent(
        &self,
        pending_transaction: nt::core::models::PendingTransaction,
        transaction: Option<nt::core::models::Transaction>,
    ) {
        use crate::core::models::*;
        self.inner.on_message_sent(
            make_pending_transaction(pending_transaction),
            transaction.map(make_transaction),
        );
    }

    fn on_message_expired(&self, pending_transaction: nt::core::models::PendingTransaction) {
        use crate::core::models::*;
        self.inner
            .on_message_expired(make_pending_transaction(pending_transaction));
    }

    fn on_state_changed(&self, new_state: nt::core::models::AccountState) {
        use crate::core::models::*;
        self.inner.on_state_changed(make_account_state(new_state));
    }

    fn on_transactions_found(
        &self,
        transactions: Vec<nt::core::models::Transaction>,
        batch_info: nt::core::models::TransactionsBatchInfo,
    ) {
        use crate::core::models::*;
        self.inner.on_transactions_found(
            transactions
                .into_iter()
                .map(make_transaction)
                .map(JsValue::from)
                .collect::<js_sys::Array>()
                .unchecked_into(),
            make_transactions_batch_info(batch_info),
        )
    }
}

#[wasm_bindgen(typescript_custom_section)]
const TON_WALLET_DETAILS: &str = r#"
export type TonWalletDetails = {
    requiresSeparateDeploy: boolean,
    minAmount: string,
    supportsPayload: boolean,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TonWalletDetails")]
    pub type TonWalletDetails;
}

fn make_ton_wallet_details(data: nt::core::ton_wallet::TonWalletDetails) -> TonWalletDetails {
    ObjectBuilder::new()
        .set("requiresSeparateDeploy", data.requires_separate_deploy)
        .set("minAmount", data.min_amount.to_string())
        .set("supportsPayload", data.supports_payload)
        .build()
        .unchecked_into()
}

#[wasm_bindgen]
pub struct ContractState {
    #[wasm_bindgen(skip)]
    pub inner: ton_block::AccountStuff,
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

impl TryFrom<ContractType> for nt::core::ton_wallet::ContractType {
    type Error = JsValue;

    fn try_from(value: ContractType) -> Result<Self, Self::Error> {
        let contract_type = JsValue::from(value)
            .as_string()
            .ok_or_else(|| JsValue::from_str("String with contract type name expected"))?;

        ton_wallet::ContractType::from_str(&contract_type).handle_error()
    }
}

impl From<nt::core::ton_wallet::ContractType> for ContractType {
    fn from(c: nt::core::ton_wallet::ContractType) -> Self {
        JsValue::from(c.to_string()).unchecked_into()
    }
}

#[wasm_bindgen(js_name = "getContractTypeDetails")]
pub fn get_contract_type_details(contract_type: ContractType) -> Result<TonWalletDetails, JsValue> {
    let contract_type: nt::core::ton_wallet::ContractType = contract_type.try_into()?;
    Ok(make_ton_wallet_details(contract_type.details()))
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "ContractType")]
    pub type ContractType;

    #[wasm_bindgen(typescript_type = "Promise<ContractState | null>")]
    pub type PromiseOptionContractState;

    #[wasm_bindgen(typescript_type = "Promise<PendingTransaction>")]
    pub type PromisePendingTransaction;
}
