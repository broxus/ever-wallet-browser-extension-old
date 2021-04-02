use std::convert::TryFrom;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use libnekoton::contracts::wallet;
use libnekoton::core;
use libnekoton::storage::keystore;
use libnekoton::transport::gql;
use libnekoton::utils::*;

use crate::utils::*;

#[wasm_bindgen]
pub struct TonWallet {
    #[wasm_bindgen(skip)]
    pub inner: wallet::Wallet,
}

#[wasm_bindgen]
impl TonWallet {
    #[wasm_bindgen(constructor)]
    pub fn new(
        public_key: &str,
        contract_type: crate::core::ContractType,
    ) -> Result<TonWallet, JsValue> {
        let public_key =
            ed25519_dalek::PublicKey::from_bytes(&hex::decode(public_key).handle_error()?)
                .handle_error()?;
        let contract_type = wallet::ContractType::try_from(contract_type)?;

        Ok(TonWallet {
            inner: wallet::Wallet::new(public_key, contract_type),
        })
    }

    #[wasm_bindgen(getter, js_name = "address")]
    pub fn address(&self) -> String {
        self.inner.compute_address().to_string()
    }

    #[wasm_bindgen(getter, js_name = "publicKey")]
    pub fn public_key(&self) -> String {
        hex::encode(self.inner.public_key().as_bytes())
    }

    #[wasm_bindgen(getter, js_name = "contractType")]
    pub fn contract_type(&self) -> crate::core::ContractType {
        self.inner.contract_type().into()
    }

    #[wasm_bindgen(js_name = "prepareDeploy")]
    pub fn prepare_deploy(&self, expire_at: u32) -> Result<UnsignedMessage, JsValue> {
        let inner = self.inner.prepare_deploy(expire_at).handle_error()?;
        Ok(UnsignedMessage { inner })
    }

    #[wasm_bindgen(js_name = "prepareTransfer")]
    pub fn prepare_transfer(
        &self,
        current_state: &ContractState,
        dest: &str,
        amount: &str,
        bounce: bool,
        expire_at: u32,
    ) -> Result<Option<UnsignedMessage>, JsValue> {
        let dest = ton_block::MsgAddressInt::from_str(dest).handle_error()?;
        let amount = u64::from_str(amount).handle_error()?;

        Ok(
            match self
                .inner
                .prepare_transfer(&current_state.inner, dest, amount, bounce, None, expire_at)
                .handle_error()?
            {
                wallet::TransferAction::Sign(inner) => Some(UnsignedMessage { inner }),
                wallet::TransferAction::DeployFirst => None,
            },
        )
    }
}

#[wasm_bindgen]
pub struct UnsignedMessage {
    #[wasm_bindgen(skip)]
    pub inner: Box<dyn keystore::UnsignedMessage>,
}

#[wasm_bindgen]
impl UnsignedMessage {
    #[wasm_bindgen(getter)]
    pub fn hash(&self) -> String {
        hex::encode(self.inner.hash())
    }

    #[wasm_bindgen(js_name = "signFake")]
    pub fn sign_fake(&self) -> Result<SignedMessage, JsValue> {
        let inner = self.inner.sign(&[0; 64]).handle_error()?;
        Ok(SignedMessage { inner })
    }

    #[wasm_bindgen]
    pub fn sign(&self, key: &crate::crypto::StoredKey, password: &str) -> Result<SignedMessage, JsValue> {
        let signature = key.inner.sign(self.inner.hash(), password.into()).handle_error()?;
        let inner = self.inner.sign(&signature).handle_error()?;
        Ok(SignedMessage { inner })
    }
}

#[wasm_bindgen]
pub struct SignedMessage {
    #[wasm_bindgen(skip)]
    pub inner: keystore::SignedMessage,
}

#[wasm_bindgen]
impl SignedMessage {
    #[wasm_bindgen(getter, js_name = "expireAt")]
    pub fn expire_at(&self) -> u32 {
        self.inner.expire_at
    }
}

#[wasm_bindgen]
pub struct TonWalletSubscription {
    #[wasm_bindgen(skip)]
    pub inner: Arc<Mutex<TonWalletSubscriptionImpl>>,
}

#[wasm_bindgen]
impl TonWalletSubscription {
    #[wasm_bindgen(js_name = "accountState")]
    pub fn account_state(&self) -> crate::core::AccountState {
        let inner = self.inner.lock().trust_me();
        inner.subscription.account_state().clone().into()
    }

    #[wasm_bindgen(js_name = "getContractState")]
    pub fn get_contract_state(&self) -> PromiseOptionContractState {
        use libnekoton::transport::Transport;

        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let inner = inner.lock().trust_me();

            Ok(
                match inner
                    .transport
                    .get_account_state(inner.subscription.address())
                    .await
                    .handle_error()?
                {
                    libnekoton::transport::models::ContractState::Exists { account, .. } => {
                        JsValue::from(ContractState { inner: account })
                    }
                    _ => JsValue::undefined(),
                },
            )
        }))
    }

    #[wasm_bindgen(js_name = "estimateFees")]
    pub fn estimate_fees(&self, signed_message: &SignedMessage) -> PromiseString {
        let inner = self.inner.clone();
        let message = signed_message.inner.message.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let mut inner = inner.lock().trust_me();

            let fees = inner
                .subscription
                .estimate_fees(&message)
                .await
                .handle_error()?;

            Ok(JsValue::from(fees.to_string()))
        }))
    }

    #[wasm_bindgen(js_name = "sendMessage")]
    pub fn send_message(&self, message: &SignedMessage) -> PromisePendingTransaction {
        use libnekoton::core::AccountSubscription;

        let inner = self.inner.clone();
        let keystore::SignedMessage { message, expire_at } = message.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let mut inner = inner.lock().trust_me();

            let pending_transaction = inner
                .subscription
                .send(&message, expire_at)
                .await
                .handle_error()?;

            Ok(JsValue::from(crate::core::PendingTransaction::from(
                pending_transaction,
            )))
        }))
    }

    #[wasm_bindgen(js_name = "getLatestBlock")]
    pub fn get_latest_block(&self) -> PromiseLatestBlock {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let inner = inner.lock().trust_me();

            let latest_block = inner
                .transport
                .get_latest_block(&inner.subscription.address())
                .await
                .handle_error()?;

            Ok(JsValue::from(LatestBlock {
                id: latest_block.id,
                end_lt: latest_block.end_lt,
                gen_utime: latest_block.gen_utime,
            }))
        }))
    }

    #[wasm_bindgen(js_name = "waitForNextBlock")]
    pub fn wait_for_next_block(&self, current: String, timeout: u32) -> PromiseString {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let inner = inner.lock().trust_me();

            let next_block = inner
                .transport
                .wait_for_next_block(
                    &current,
                    &inner.subscription.address(),
                    Duration::from_secs(timeout as u64),
                )
                .await
                .handle_error()?;
            Ok(JsValue::from(next_block))
        }))
    }

    #[wasm_bindgen(js_name = "refresh")]
    pub fn refresh(&mut self) -> PromiseVoid {
        use libnekoton::core::AccountSubscription;

        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let mut inner = inner.lock().trust_me();
            inner.subscription.refresh().await.handle_error()?;
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(js_name = "handleBlock")]
    pub fn handle_block(&mut self, block_id: String) -> PromiseVoid {
        use libnekoton::core::AccountSubscription;

        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let mut inner = inner.lock().trust_me();

            let block = inner.transport.get_block(&block_id).await.handle_error()?;
            inner
                .subscription
                .handle_block(&block)
                .await
                .handle_error()?;
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(js_name = "preloadTransactions")]
    pub fn preload_transactions(&mut self, from: &crate::core::TransactionId) -> PromiseVoid {
        let from = core::models::TransactionId {
            lt: from.lt,
            hash: from.hash,
        };

        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let mut inner = inner.lock().trust_me();
            inner
                .subscription
                .preload_transactions(from)
                .await
                .handle_error()?;
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(getter, js_name = "pollingMethod")]
    pub fn polling_method(&self) -> crate::core::PollingMethod {
        use libnekoton::core::AccountSubscription;

        crate::core::convert_polling_method(
            self.inner.lock().trust_me().subscription.polling_method(),
        )
    }
}

pub struct TonWalletSubscriptionImpl {
    transport: Arc<gql::GqlTransport>,
    subscription: core::ton_wallet::TonWalletSubscription,
}

impl TonWalletSubscriptionImpl {
    pub fn new(
        transport: Arc<gql::GqlTransport>,
        subscription: core::ton_wallet::TonWalletSubscription,
    ) -> Self {
        Self {
            transport,
            subscription,
        }
    }
}

#[wasm_bindgen]
pub struct LatestBlock {
    #[wasm_bindgen(skip)]
    pub id: String,
    #[wasm_bindgen(skip)]
    pub end_lt: u64,
    #[wasm_bindgen(skip)]
    pub gen_utime: u32,
}

#[wasm_bindgen]
impl LatestBlock {
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.id.clone()
    }

    #[wasm_bindgen(getter, final, js_name = "endLt")]
    pub fn end_lt(&self) -> String {
        self.end_lt.to_string()
    }

    #[wasm_bindgen(getter, final, js_name = "genUtime")]
    pub fn gen_utime(&self) -> u32 {
        self.gen_utime
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = "TonWalletSubscriptionHandler")]
    pub type TonWalletNotificationHandlerImpl;

    #[wasm_bindgen(method, js_name = "onMessageSent")]
    pub fn on_message_sent(
        this: &TonWalletNotificationHandlerImpl,
        pending_transaction: crate::core::PendingTransaction,
        transaction: crate::core::Transaction,
    );

    #[wasm_bindgen(method, js_name = "onMessageExpired")]
    pub fn on_message_expired(
        this: &TonWalletNotificationHandlerImpl,
        pending_transaction: crate::core::PendingTransaction,
    );

    #[wasm_bindgen(method, js_name = "onStateChanged")]
    pub fn on_state_changed(
        this: &TonWalletNotificationHandlerImpl,
        new_state: crate::core::AccountState,
    );

    #[wasm_bindgen(method, js_name = "onTransactionsFound")]
    pub fn on_transactions_found(
        this: &TonWalletNotificationHandlerImpl,
        transactions: TransactionsList,
        batch_info: crate::core::TransactionsBatchInfo,
    );
}

unsafe impl Send for TonWalletNotificationHandlerImpl {}

unsafe impl Sync for TonWalletNotificationHandlerImpl {}

pub struct TonWalletNotificationHandler {
    inner: TonWalletNotificationHandlerImpl,
}

impl From<TonWalletNotificationHandlerImpl> for TonWalletNotificationHandler {
    fn from(inner: TonWalletNotificationHandlerImpl) -> Self {
        Self { inner }
    }
}

impl core::AccountSubscriptionHandler for TonWalletNotificationHandler {
    fn on_message_sent(
        &self,
        pending_transaction: core::models::PendingTransaction,
        transaction: core::models::Transaction,
    ) {
        self.inner
            .on_message_sent(pending_transaction.into(), transaction.into());
    }

    fn on_message_expired(&self, pending_transaction: core::models::PendingTransaction) {
        self.inner.on_message_expired(pending_transaction.into());
    }

    fn on_state_changed(&self, new_state: core::models::AccountState) {
        self.inner.on_state_changed(new_state.into());
    }

    fn on_transactions_found(
        &self,
        transactions: Vec<core::models::Transaction>,
        batch_info: core::models::TransactionsBatchInfo,
    ) {
        self.inner.on_transactions_found(
            transactions
                .into_iter()
                .map(crate::core::Transaction::from)
                .map(JsValue::from)
                .collect::<js_sys::Array>()
                .unchecked_into(),
            batch_info.into(),
        )
    }
}

#[wasm_bindgen]
pub struct ContractState {
    #[wasm_bindgen(skip)]
    pub inner: ton_block::AccountStuff,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<ContractState | null>")]
    pub type PromiseOptionContractState;

    #[wasm_bindgen(typescript_type = "Promise<PendingTransaction>")]
    pub type PromisePendingTransaction;

    #[wasm_bindgen(typescript_type = "Promise<LatestBlock>")]
    pub type PromiseLatestBlock;
}
