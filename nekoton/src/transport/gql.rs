use std::convert::TryFrom;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use anyhow::Result;
use async_trait::async_trait;
use futures::channel::oneshot;
use libnekoton::core;
use libnekoton::transport::{self, gql, Transport};
use ton_block::{Deserializable, HashmapAugType};
use ton_types::HashmapType;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use crate::utils::{HandleError, PromiseVoid, TrustMe};

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
                .get_latest_block(&inner.address)
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
                    &inner.address,
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
            inner.refresh().await.handle_error()?;
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
            inner.handle_block(&block).await.handle_error()?;
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(getter, js_name = "pollingMethod")]
    pub fn polling_method(&self) -> PollingMethod {
        convert_polling_method(self.inner.lock().trust_me().polling_method)
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

    #[wasm_bindgen(getter, js_name = "endLt")]
    pub fn end_lt(&self) -> String {
        self.end_lt.to_string()
    }

    #[wasm_bindgen(getter, js_name = "genUtime")]
    pub fn gen_utime(&self) -> u32 {
        self.gen_utime
    }
}

#[wasm_bindgen]
extern "C" {
    pub type MainWalletNotificationHandler;

    #[wasm_bindgen(method, js_name = "onStateChanged")]
    pub fn on_state_changed(
        this: &MainWalletNotificationHandler,
        new_state: crate::core::AccountState,
    );

    #[wasm_bindgen(method, js_name = "onTransactions")]
    pub fn on_transactions(this: &MainWalletNotificationHandler, transaction: TransactionsList);
}

unsafe impl Send for MainWalletNotificationHandler {}
unsafe impl Sync for MainWalletNotificationHandler {}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "'manual' | 'reliable'")]
    pub type PollingMethod;

    #[wasm_bindgen(typescript_type = "Array<Transaction>")]
    pub type TransactionsList;
}

fn convert_polling_method(s: core::PollingMethod) -> PollingMethod {
    JsValue::from(match s {
        core::PollingMethod::Manual => "manual",
        core::PollingMethod::Reliable => "reliable",
    })
    .unchecked_into()
}

pub struct MainWalletSubscriptionImpl {
    pub handler: Arc<MainWalletNotificationHandler>,
    pub address: ton_block::MsgAddressInt,
    pub transport: gql::GqlTransport,
    pub account_state: core::models::AccountState,
    pub latest_known_transaction: Option<core::models::TransactionId>,
    pub polling_method: core::PollingMethod,
}

impl MainWalletSubscriptionImpl {
    pub async fn subscribe(
        handler: Arc<MainWalletNotificationHandler>,
        address: ton_block::MsgAddressInt,
        transport: gql::GqlTransport,
    ) -> Result<Self> {
        const INITIAL_TRANSACTION_COUNT: usize = 16;

        let mut result = Self {
            handler,
            address,
            transport,
            account_state: core::models::AccountState {
                balance: 0,
                gen_timings: core::models::GenTimings::Unknown,
                last_transaction_id: None,
                is_deployed: false,
            },
            latest_known_transaction: None,
            polling_method: core::PollingMethod::Manual,
        };

        if result.refresh_account_state().await? {
            result
                .refresh_latest_transactions(Some(INITIAL_TRANSACTION_COUNT))
                .await?;
        }

        Ok(result)
    }

    pub async fn refresh_account_state(&mut self) -> Result<bool> {
        let new_state = match self.transport.get_account_state(&self.address).await? {
            transport::models::ContractState::NotExists => core::models::AccountState {
                balance: 0,
                gen_timings: core::models::GenTimings::Unknown,
                last_transaction_id: None,
                is_deployed: false,
            },
            transport::models::ContractState::Exists {
                account,
                timings,
                last_transaction_id,
            } => core::models::AccountState {
                balance: account.storage.balance.grams.0 as u64,
                gen_timings: timings,
                last_transaction_id: Some(last_transaction_id),
                is_deployed: matches!(
                    account.storage.state,
                    ton_block::AccountState::AccountActive(_)
                ),
            },
        };

        match (
            &self.account_state.last_transaction_id,
            &new_state.last_transaction_id,
        ) {
            (None, Some(_)) => self.account_state = new_state,
            (Some(current), Some(new)) if current.lt < new.lt => self.account_state = new_state,
            _ => return Ok(false),
        }

        self.handler
            .on_state_changed(self.account_state.clone().into());

        Ok(true)
    }

    pub async fn refresh_latest_transactions(&mut self, soft_limit: Option<usize>) -> Result<()> {
        const TRANSACTIONS_PER_FETCH: u8 = 16;

        let mut from = match self.account_state.last_transaction_id {
            Some(id) => id,
            None => return Ok(()),
        };

        let mut new_latest_known_transaction = None;
        let mut total_fetched = 0;

        loop {
            let new_transactions = self
                .transport
                .get_transactions(&self.address, &from, TRANSACTIONS_PER_FETCH)
                .await?
                .into_iter()
                .filter(|transaction| match &self.latest_known_transaction {
                    Some(id) => transaction.data.lt > id.lt,
                    _ => true,
                })
                .filter_map(|transaction| {
                    core::models::Transaction::try_from((transaction.hash, transaction.data)).ok()
                })
                .collect::<Vec<_>>();

            total_fetched += new_transactions.len();

            if new_latest_known_transaction.is_none() {
                new_latest_known_transaction =
                    new_transactions.first().map(|transaction| transaction.id);
            }

            let last_prev_id = match new_transactions.last() {
                Some(last) => {
                    let last_prev_id = last.prev_trans_id;
                    self.handler.on_transactions(
                        new_transactions
                            .into_iter()
                            .map(crate::core::Transaction::from)
                            .map(JsValue::from)
                            .collect::<js_sys::Array>()
                            .unchecked_into(),
                    );
                    last_prev_id
                }
                _ => break,
            };

            if matches!(soft_limit, Some(limit) if total_fetched >= limit) {
                break;
            }

            // Check new transactions tail with latest known transaction
            match &self.latest_known_transaction {
                // Account was in `Nonexist` state and got some messages
                None => match last_prev_id {
                    // If there are some unprocessed transactions left we should request remaining
                    Some(id) => from = id,
                    // If there are no unprocessed transactions left we should stop
                    None => break,
                },
                // Account was in `Active` state and got some messages.
                // The only case, when we should continue receiving, is when last transactions id is not the latest.
                Some(latest) => match last_prev_id {
                    // Check previous id of last transaction
                    Some(previous) if previous.lt > latest.lt => {
                        from = previous;
                    }
                    _ => break,
                },
                _ => break,
            }
        }

        if let Some(id) = new_latest_known_transaction {
            self.latest_known_transaction = Some(id);
        }

        Ok(())
    }
}

#[async_trait]
impl core::AccountSubscription for MainWalletSubscriptionImpl {
    async fn send(&mut self, message: &ton_block::Message) -> Result<()> {
        self.polling_method = core::PollingMethod::Reliable;
        self.transport.send_message(message).await?;
        Ok(())
    }

    async fn refresh(&mut self) -> Result<()> {
        if self.refresh_account_state().await? {
            self.refresh_latest_transactions(None).await?;
        }
        Ok(())
    }

    async fn handle_block(&mut self, block: &ton_block::Block) -> Result<()> {
        let info = block
            .info
            .read_struct()
            .map_err(|_| SubscriptionError::InvalidBlock)?;

        let account_block = match block
            .extra
            .read_struct()
            .and_then(|extra| extra.read_account_blocks())
            .and_then(|account_blocks| {
                account_blocks.get(&self.address.address().get_bytestring(0).into())
            }) {
            Ok(Some(extra)) => extra,
            _ => return Ok(()),
        };

        let mut new_transactions = Vec::new();

        for item in account_block.transactions().iter() {
            match item.and_then(|(_, value)| {
                let cell = value.into_cell().reference(0)?;
                let hash = cell.repr_hash();

                ton_block::Transaction::construct_from_cell(cell)
                    .map(|transaction| (hash, transaction))
            }) {
                Ok(transaction) => new_transactions.push(transaction),
                Err(_) => continue,
            };
        }

        // TODO: handle account change

        Ok(())
    }
}

#[derive(thiserror::Error, Debug)]
pub enum SubscriptionError {
    #[error("Invalid block structure")]
    InvalidBlock,
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
        handler: MainWalletNotificationHandler,
    ) -> Result<PromiseMainWalletSubscription, JsValue> {
        let address = ton_block::MsgAddressInt::from_str(addr).handle_error()?;
        let transport = self.make_transport();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let inner = Arc::new(Mutex::new(
                MainWalletSubscriptionImpl::subscribe(Arc::new(handler), address, transport)
                    .await
                    .handle_error()?,
            ));
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
