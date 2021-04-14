use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use num_bigint::BigUint;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use nt::core::token_wallet;
use nt::utils::*;

use super::PromiseLatestBlock;
use crate::utils::*;

#[wasm_bindgen]
pub struct TokenWallet {
    #[wasm_bindgen(skip)]
    pub version: String,
    #[wasm_bindgen(skip)]
    pub symbol: nt::core::models::Symbol,
    #[wasm_bindgen(skip)]
    pub owner: String,
    #[wasm_bindgen(skip)]
    pub inner: Arc<TokenWalletImpl>,
}

#[wasm_bindgen]
impl TokenWallet {
    #[wasm_bindgen(js_name = "makeCollectTokensCall")]
    pub fn make_collect_tokens_call(
        eth_event_address: &str,
    ) -> Result<crate::core::InternalMessage, JsValue> {
        let eth_event_address = parse_address(eth_event_address)?;
        Ok(token_wallet::make_collect_tokens_call(eth_event_address).into())
    }

    #[wasm_bindgen(getter)]
    pub fn version(&self) -> String {
        self.version.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn symbol(&self) -> crate::core::models::Symbol {
        use crate::core::models::*;
        make_symbol(self.symbol.clone())
    }

    #[wasm_bindgen(getter)]
    pub fn owner(&self) -> String {
        self.owner.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn balance(&self) -> String {
        self.inner.wallet.lock().trust_me().balance().to_string()
    }

    #[wasm_bindgen(js_name = "prepareDeploy")]
    pub fn prepare_deploy(&self) -> Result<crate::core::InternalMessage, JsValue> {
        let wallet = self.inner.wallet.lock().trust_me();
        wallet.prepare_deploy().handle_error().map(From::from)
    }

    #[wasm_bindgen(js_name = "prepareTransfer")]
    pub fn prepare_transfer(
        &self,
        dest: &str,
        tokens: &str,
    ) -> Result<PromiseInternalMessage, JsValue> {
        let dest = parse_address(dest)?;
        let tokens = BigUint::from_str(tokens).handle_error()?;

        let inner = self.inner.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = inner.wallet.lock().trust_me();

            // TODO: resolve token wallet by owner and send directly
            let message = wallet
                .prepare_transfer(
                    nt::core::transactions::TransferRecipient::OwnerWallet(dest),
                    tokens,
                )
                .handle_error()?;
            Ok(JsValue::from(crate::core::InternalMessage::from(message)))
        })))
    }

    #[wasm_bindgen(js_name = "prepareSwapBack")]
    pub fn prepare_swap_back(
        &self,
        dest: String,
        tokens: &str,
        proxy_address: &str,
    ) -> Result<PromiseInternalMessage, JsValue> {
        let tokens = BigUint::from_str(tokens).handle_error()?;
        let proxy_address = parse_address(proxy_address)?;

        let inner = self.inner.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = inner.wallet.lock().trust_me();

            let message = wallet
                .prepare_swap_back(dest, tokens, proxy_address)
                .handle_error()?;
            Ok(JsValue::from(crate::core::InternalMessage::from(message)))
        })))
    }

    #[wasm_bindgen(js_name = "getProxyAddress")]
    pub fn get_proxy_address(&self) -> PromiseString {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let mut wallet = inner.wallet.lock().trust_me();

            let address = wallet.get_proxy_address().await.handle_error()?;
            Ok(JsValue::from(address.to_string()))
        }))
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
}

pub struct TokenWalletImpl {
    transport: Arc<nt::transport::gql::GqlTransport>,
    wallet: Mutex<token_wallet::TokenWallet>,
}

impl TokenWalletImpl {
    pub fn new(
        transport: Arc<nt::transport::gql::GqlTransport>,
        wallet: token_wallet::TokenWallet,
    ) -> Self {
        Self {
            transport,
            wallet: Mutex::new(wallet),
        }
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<InternalMessage>")]
    pub type PromiseInternalMessage;
}
