use std::convert::{TryFrom, TryInto};
use std::str::FromStr;
use std::sync::{Arc, Mutex};

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use nt::core::models as core_models;
use nt::core::ton_wallet;
use nt_abi as abi;
use nt_utils::TrustMe;

use crate::core::models::make_multisig_pending_transaction;
use crate::transport::TransportHandle;
use crate::utils::*;

#[wasm_bindgen]
pub struct TonWallet {
    #[wasm_bindgen(skip)]
    pub address: String,
    #[wasm_bindgen(skip)]
    pub public_key: String,
    #[wasm_bindgen(skip)]
    pub contract_type: ton_wallet::WalletType,
    #[wasm_bindgen(skip)]
    pub details: ton_wallet::TonWalletDetails,
    #[wasm_bindgen(skip)]
    pub inner: Arc<TonWalletImpl>,
}

impl TonWallet {
    pub fn new(transport: TransportHandle, wallet: ton_wallet::TonWallet) -> Self {
        Self {
            address: wallet.address().to_string(),
            public_key: hex::encode(wallet.public_key().as_bytes()),
            contract_type: wallet.wallet_type(),
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

    #[wasm_bindgen(js_name = "contractState")]
    pub fn contract_state(&self) -> crate::core::models::ContractState {
        let inner = self.inner.wallet.lock().trust_me();
        crate::core::models::make_contract_state(*inner.contract_state())
    }

    #[wasm_bindgen(js_name = "prepareDeploy")]
    pub fn prepare_deploy(&self, timeout: u32) -> Result<crate::crypto::UnsignedMessage, JsValue> {
        let wallet = self.inner.wallet.lock().trust_me();

        let inner = wallet
            .prepare_deploy(core_models::Expiration::Timeout(timeout))
            .handle_error()?;
        Ok(crate::crypto::UnsignedMessage { inner })
    }

    #[wasm_bindgen(js_name = "prepareDeployWithMultipleOwners")]
    pub fn prepare_deploy_with_multiple_owners(
        &self,
        timeout: u32,
        custodians: CustodiansList,
        req_confirms: u8,
    ) -> Result<crate::crypto::UnsignedMessage, JsValue> {
        let wallet = self.inner.wallet.lock().trust_me();

        let custodians = parse_custodians_list(custodians)?;

        let inner = wallet
            .prepare_deploy_with_multiple_owners(
                core_models::Expiration::Timeout(timeout),
                &custodians,
                req_confirms,
            )
            .handle_error()?;
        Ok(crate::crypto::UnsignedMessage { inner })
    }

    #[wasm_bindgen(js_name = "prepareConfirm")]
    pub fn prepare_confirm(
        &self,
        raw_current_state: &RawContractState,
        public_key: &str,
        transaction_id: &str,
        timeout: u32,
    ) -> Result<crate::crypto::UnsignedMessage, JsValue> {
        let public_key = parse_public_key(public_key)?;
        let transaction_id = u64::from_str_radix(transaction_id, 16).handle_error()?;

        let wallet = self.inner.wallet.lock().unwrap();
        let message = wallet
            .prepare_confirm_transaction(
                &raw_current_state.inner,
                &public_key,
                transaction_id,
                core_models::Expiration::Timeout(timeout),
            )
            .handle_error()?;

        Ok(crate::crypto::UnsignedMessage { inner: message })
    }

    #[wasm_bindgen(js_name = "prepareTransfer")]
    pub fn prepare_transfer(
        &self,
        raw_current_state: &RawContractState,
        public_key: &str,
        dest: &str,
        amount: &str,
        bounce: bool,
        body: &str,
        timeout: u32,
    ) -> Result<Option<crate::crypto::UnsignedMessage>, JsValue> {
        let public_key = parse_public_key(public_key)?;
        let dest = parse_address(dest)?;
        let amount = u64::from_str(amount).handle_error()?;
        let body = if !body.is_empty() {
            Some(parse_slice(body)?)
        } else {
            None
        };

        let mut wallet = self.inner.wallet.lock().unwrap();

        Ok(
            match wallet
                .prepare_transfer(
                    &raw_current_state.inner,
                    &public_key,
                    dest,
                    amount,
                    bounce,
                    body,
                    core_models::Expiration::Timeout(timeout),
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

    #[wasm_bindgen(js_name = "getCustodians")]
    pub fn get_custodians(&self) -> Option<CustodiansList> {
        let inner = self.inner.clone();

        let wallet = inner.wallet.lock().trust_me();
        let custodians = wallet.get_custodians().as_ref()?;

        Some(
            custodians
                .iter()
                .map(|item| JsValue::from_str(&item.to_hex_string()))
                .collect::<js_sys::Array>()
                .unchecked_into(),
        )
    }

    #[wasm_bindgen(js_name = "getMultisigPendingTransactions")]
    pub fn get_pending_transactions(&self) -> MultisigPendingTransactionList {
        let inner = self.inner.clone();

        let wallet = inner.wallet.lock().trust_me();
        let pending_transactions = wallet.get_unconfirmed_transactions().to_vec();
        pending_transactions
            .into_iter()
            .map(make_multisig_pending_transaction)
            .collect::<js_sys::Array>()
            .unchecked_into()
    }

    #[wasm_bindgen(js_name = "getContractState")]
    pub fn get_contract_state(&self) -> PromiseOptionRawContractState {
        use nt::transport::models;

        let address = self.inner.wallet.lock().trust_me().address().clone();
        let transport = self.inner.transport.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let contract_state = transport
                .transport()
                .get_contract_state(&address)
                .await
                .handle_error()?;

            Ok(match contract_state {
                models::RawContractState::Exists(state) => JsValue::from(RawContractState {
                    inner: state.account,
                }),
                models::RawContractState::NotExists => JsValue::undefined(),
            })
        }))
    }

    #[wasm_bindgen(js_name = "estimateFees")]
    pub fn estimate_fees(
        &self,
        signed_message: crate::crypto::JsSignedMessage,
        execution_options: crate::core::models::TransactionExecutionOptions,
    ) -> Result<PromiseString, JsValue> {
        let inner = self.inner.clone();
        let message = crate::crypto::parse_signed_message(signed_message)?;
        let execution_options =
            crate::core::models::parse_transaction_executor_options(execution_options)?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = inner.wallet.lock().trust_me();

            let transaction = wallet
                .contract_subscription()
                .execute_transaction_locally(&message.boc, execution_options)
                .await
                .handle_error()?;

            let descr = transaction.read_description().handle_error()?;
            let fees = if let ton_block::TransactionDescr::Ordinary(descr) = descr {
                nt_utils::compute_total_transaction_fees(&transaction, &descr)
            } else {
                transaction.total_fees.grams.0
            };

            Ok(JsValue::from(fees.to_string()))
        })))
    }

    #[wasm_bindgen(js_name = "sendMessage")]
    pub fn send_message(
        &self,
        message: crate::crypto::JsSignedMessage,
    ) -> Result<crate::core::models::PromisePendingTransaction, JsValue> {
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
            let block = inner.transport.get_block(&block_id).await?;

            let mut wallet = inner.wallet.lock().trust_me();
            wallet.handle_block(&block).await.handle_error()?;

            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(js_name = "preloadTransactions")]
    pub fn preload_transactions(&mut self, lt: &str, hash: &str) -> Result<PromiseVoid, JsValue> {
        let from = abi::TransactionId {
            lt: u64::from_str(lt).handle_error()?,
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
    transport: TransportHandle,
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
        new_state: crate::core::models::ContractState,
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
        pending_transaction: core_models::PendingTransaction,
        transaction: Option<core_models::Transaction>,
    ) {
        use crate::core::models::*;
        self.inner.on_message_sent(
            make_pending_transaction(pending_transaction),
            transaction.map(make_transaction),
        );
    }

    fn on_message_expired(&self, pending_transaction: core_models::PendingTransaction) {
        use crate::core::models::*;
        self.inner
            .on_message_expired(make_pending_transaction(pending_transaction));
    }

    fn on_state_changed(&self, new_state: core_models::ContractState) {
        use crate::core::models::*;
        self.inner.on_state_changed(make_contract_state(new_state));
    }

    fn on_transactions_found(
        &self,
        transactions: Vec<core_models::TransactionWithData<core_models::TransactionAdditionalInfo>>,
        batch_info: core_models::TransactionsBatchInfo,
    ) {
        use crate::core::models::*;

        self.inner.on_transactions_found(
            transactions
                .into_iter()
                .map(make_ton_wallet_transaction)
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
    supportsMultipleOwners: boolean,
    expirationTime: number,
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
        .set("supportsMultipleOwners", data.supports_multiple_owners)
        .set("expirationTime", data.expiration_time)
        .build()
        .unchecked_into()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Array<string>")]
    pub type CustodiansList;
}

fn parse_custodians_list(
    custodians: CustodiansList,
) -> Result<Vec<ed25519_dalek::PublicKey>, JsValue> {
    if !js_sys::Array::is_array(&custodians) {
        return Err(TonWalletError::ExpectedArray).handle_error();
    }

    custodians
        .unchecked_into::<js_sys::Array>()
        .iter()
        .map(|public_key| match public_key.as_string() {
            Some(public_key) => parse_public_key(&public_key),
            None => Err(TonWalletError::ExpectedPublicKeyString).handle_error(),
        })
        .collect::<Result<Vec<_>, JsValue>>()
}

#[wasm_bindgen]
pub struct RawContractState {
    #[wasm_bindgen(skip)]
    pub inner: ton_block::AccountStuff,
}

#[wasm_bindgen]
impl RawContractState {
    #[wasm_bindgen(getter)]
    pub fn balance(&self) -> String {
        self.inner.storage.balance.grams.to_string()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const CONTRACT_TYPE: &'static str = r#"
export type ContractType =
    | 'SafeMultisigWallet'
    | 'SafeMultisigWallet24h'
    | 'SetcodeMultisigWallet'
    | 'BridgeMultisigWallet'
    | 'SurfWallet'
    | 'WalletV3';
"#;

impl TryFrom<ContractType> for nt::core::ton_wallet::WalletType {
    type Error = JsValue;

    fn try_from(value: ContractType) -> Result<Self, Self::Error> {
        let contract_type = JsValue::from(value)
            .as_string()
            .ok_or_else(|| JsValue::from_str("String with contract type name expected"))?;

        ton_wallet::WalletType::from_str(&contract_type).handle_error()
    }
}

impl From<nt::core::ton_wallet::WalletType> for ContractType {
    fn from(c: nt::core::ton_wallet::WalletType) -> Self {
        JsValue::from(c.to_string()).unchecked_into()
    }
}

#[wasm_bindgen(js_name = "getContractTypeDetails")]
pub fn get_contract_type_details(contract_type: ContractType) -> Result<TonWalletDetails, JsValue> {
    let contract_type: nt::core::ton_wallet::WalletType = contract_type.try_into()?;
    Ok(make_ton_wallet_details(contract_type.details()))
}

#[wasm_bindgen(typescript_custom_section)]
const TON_WALLET_TRANSACTION: &str = r#"
export type TonWalletTransaction = Transaction & { info?: TransactionAdditionalInfo };
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TonWalletTransaction")]
    pub type TonWalletTransaction;
}

fn make_ton_wallet_transaction(
    data: core_models::TransactionWithData<core_models::TransactionAdditionalInfo>,
) -> TonWalletTransaction {
    let transaction = crate::core::models::make_transaction(data.transaction);
    if let Some(data) = data.data {
        js_sys::Reflect::set(
            &transaction,
            &JsValue::from_str("info"),
            &crate::core::models::make_transaction_additional_info(data)
                .map(|item| item.unchecked_into())
                .unwrap_or_else(JsValue::undefined),
        )
        .trust_me();
    }
    transaction.unchecked_into()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "ContractType")]
    pub type ContractType;

    #[wasm_bindgen(typescript_type = "Promise<RawContractState | null>")]
    pub type PromiseOptionRawContractState;

    #[wasm_bindgen(typescript_type = "Array<TonWalletTransaction>")]
    pub type TonWalletTransactionsList;
}

#[derive(thiserror::Error, Debug)]
enum TonWalletError {
    #[error("Expected array")]
    ExpectedArray,
    #[error("Expected public key string")]
    ExpectedPublicKeyString,
}
