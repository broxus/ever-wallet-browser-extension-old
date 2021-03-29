use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use anyhow::Result;
use async_trait::async_trait;
use futures::channel::oneshot;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use libnekoton::core;
use libnekoton::transport::{gql, Transport};
use libnekoton::utils::*;

use crate::utils::{HandleError, PromiseVoid};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
extern "C" {
    pub type GqlSender;

    #[wasm_bindgen(method)]
    pub fn send(this: &GqlSender, data: &str, handler: GqlQuery);
}

unsafe impl Send for GqlSender {}
unsafe impl Sync for GqlSender {}

#[wasm_bindgen]
pub struct MainWalletSubscription {
    #[wasm_bindgen(skip)]
    pub inner: Arc<Mutex<MainWalletSubscriptionImpl>>,
}

#[wasm_bindgen]
impl MainWalletSubscription {
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
    pub fn wait_for_next_block(&self, current: String, timeout: u32) -> PromiseNextBlock {
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
    pub fn polling_method(&self) -> PollingMethod {
        use libnekoton::core::AccountSubscription;

        convert_polling_method(self.inner.lock().trust_me().subscription.polling_method())
    }
}

#[wasm_bindgen]
pub struct MainWalletSubscriptionImpl {
    transport: Arc<gql::GqlTransport>,
    subscription: core::MainWalletSubscription,
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
    #[wasm_bindgen(js_name = "MainWalletSubscriptionHandler")]
    pub type MainWalletNotificationHandlerImpl;

    #[wasm_bindgen(method, js_name = "onMessageSent")]
    pub fn on_message_sent(
        this: &MainWalletNotificationHandlerImpl,
        pending_transaction: crate::core::PendingTransaction,
        transaction: crate::core::Transaction,
    );

    #[wasm_bindgen(method, js_name = "onMessageExpired")]
    pub fn on_message_expired(
        this: &MainWalletNotificationHandlerImpl,
        pending_transaction: crate::core::PendingTransaction,
    );

    #[wasm_bindgen(method, js_name = "onStateChanged")]
    pub fn on_state_changed(
        this: &MainWalletNotificationHandlerImpl,
        new_state: crate::core::AccountState,
    );

    #[wasm_bindgen(method, js_name = "onTransactionsFound")]
    pub fn on_transactions_found(
        this: &MainWalletNotificationHandlerImpl,
        transactions: TransactionsList,
        batch_info: crate::core::TransactionsBatchInfo,
    );
}

unsafe impl Send for MainWalletNotificationHandlerImpl {}
unsafe impl Sync for MainWalletNotificationHandlerImpl {}

pub struct MainWalletNotificationHandler {
    inner: MainWalletNotificationHandlerImpl,
}

impl core::AccountSubscriptionHandler for MainWalletNotificationHandler {
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
extern "C" {
    #[wasm_bindgen(typescript_type = "'manual' | 'reliable'")]
    pub type PollingMethod;

    #[wasm_bindgen(typescript_type = "Array<Transaction>")]
    pub type TransactionsList;

    #[wasm_bindgen(typescript_type = "'new' | 'old'")]
    pub type BatchType;
}

fn convert_polling_method(s: core::PollingMethod) -> PollingMethod {
    JsValue::from(match s {
        core::PollingMethod::Manual => "manual",
        core::PollingMethod::Reliable => "reliable",
    })
    .unchecked_into()
}

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
            inner: Arc::new(GqlConnectionImpl {
                sender: Arc::new(sender),
            }),
        }
    }

    #[wasm_bindgen(js_name = "subscribeToMainWallet")]
    pub fn subscribe_main_wallet(
        &self,
        addr: &str,
        handler: MainWalletNotificationHandlerImpl,
    ) -> Result<PromiseMainWalletSubscription, JsValue> {
        let address = ton_block::MsgAddressInt::from_str(addr).handle_error()?;
        let transport = Arc::new(self.make_transport());
        let handler = Arc::new(MainWalletNotificationHandler { inner: handler });

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let subscription = core::MainWalletSubscription::subscribe(
                transport.clone() as Arc<dyn Transport>,
                address,
                handler,
            )
            .await
            .handle_error()?;

            let inner = Arc::new(Mutex::new(MainWalletSubscriptionImpl {
                transport,
                subscription,
            }));

            Ok(JsValue::from(MainWalletSubscription { inner }))
        })))
    }
}

impl GqlConnection {
    pub fn make_transport(&self) -> gql::GqlTransport {
        gql::GqlTransport::new(self.inner.clone())
    }
}

pub struct GqlConnectionImpl {
    sender: Arc<GqlSender>,
}

#[async_trait]
impl gql::GqlConnection for GqlConnectionImpl {
    async fn post(&self, data: &str) -> Result<String> {
        let (tx, rx) = oneshot::channel();

        self.sender.send(data, GqlQuery { tx });

        let response = rx
            .await
            .unwrap_or_else(|_| Err(QueryError::RequestDropped))?;
        Ok(response)
    }
}

type GqlQueryResult = Result<String, QueryError>;

#[wasm_bindgen]
pub struct GqlQuery {
    #[wasm_bindgen(skip)]
    pub tx: oneshot::Sender<GqlQueryResult>,
}

#[wasm_bindgen]
impl GqlQuery {
    #[wasm_bindgen(js_name = "onReceive")]
    pub fn on_receive(self, data: String) {
        let _ = self.tx.send(Ok(data));
    }

    #[wasm_bindgen(js_name = "onError")]
    pub fn on_error(self, _: JsValue) {
        let _ = self.tx.send(Err(QueryError::RequestFailed));
    }

    #[wasm_bindgen(js_name = "onTimeout")]
    pub fn on_timeout(self) {
        let _ = self.tx.send(Err(QueryError::TimeoutReached));
    }
}

#[derive(thiserror::Error, Debug)]
pub enum QueryError {
    #[error("Request dropped unexpectedly")]
    RequestDropped,
    #[error("Timeout reached")]
    TimeoutReached,
    #[error("Request failed")]
    RequestFailed,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<MainWalletSubscription>")]
    pub type PromiseMainWalletSubscription;

    #[wasm_bindgen(typescript_type = "Promise<LatestBlock>")]
    pub type PromiseLatestBlock;

    #[wasm_bindgen(typescript_type = "Promise<string>")]
    pub type PromiseNextBlock;
}
