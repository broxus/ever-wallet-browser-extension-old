use std::str::FromStr;
use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use async_trait::async_trait;
use futures::channel::oneshot;
use js_sys::Promise;
use libnekoton::transport::gql;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::future_to_promise;

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
pub struct AccountSubscription {
    #[wasm_bindgen(skip)]
    pub inner: Arc<AccountSubscriptionImpl>,
}

#[wasm_bindgen]
impl AccountSubscription {
    #[wasm_bindgen(js_name = "getLatestBlock")]
    pub fn get_latest_block(&self) -> PromiseLatestBlock {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
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

    #[wasm_bindgen(js_name = "handleBlock")]
    pub fn handle_block(&mut self, block_id: String) -> PromiseVoid {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let block = inner.transport.get_block(&block_id).await.handle_error()?;
            log(&format!("Got block with id: {}", block.global_id));
            Ok(JsValue::undefined())
        }))
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

pub struct AccountSubscriptionImpl {
    pub address: ton_block::MsgAddressInt,
    pub transport: gql::GqlTransport,
}

impl AccountSubscriptionImpl {
    // async fn subscribe(
    //     connection: &GqlConnection,
    //     address: ton_block::MsgAddressInt,
    // ) -> Result<Self> {
    // }

    fn new(connection: &GqlConnection, address: ton_block::MsgAddressInt) -> Self {
        Self {
            address,
            transport: connection.make_transport(),
        }
    }
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

    #[wasm_bindgen]
    pub fn subscribe(&self, addr: &str) -> Result<AccountSubscription, JsValue> {
        let addr = ton_block::MsgAddressInt::from_str(addr).handle_error()?;

        Ok(AccountSubscription {
            inner: Arc::new(AccountSubscriptionImpl::new(self, addr)),
        })
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
    #[wasm_bindgen(typescript_type = "Promise<AccountSubscription>")]
    pub type PromiseAccountSubscription;

    #[wasm_bindgen(typescript_type = "Promise<LatestBlock>")]
    pub type PromiseLatestBlock;

    #[wasm_bindgen(typescript_type = "Promise<string>")]
    pub type PromiseNextBlock;
}
