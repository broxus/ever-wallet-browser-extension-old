use std::str::FromStr;
use std::sync::{Arc, Mutex};

use num_bigint::BigUint;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use nt::core::models as core_models;
use nt::core::token_wallet;
use nt::utils::*;

use crate::utils::*;

#[wasm_bindgen]
pub struct TokenWallet {
    #[wasm_bindgen(skip)]
    pub version: String,
    #[wasm_bindgen(skip)]
    pub symbol: core_models::Symbol,
    #[wasm_bindgen(skip)]
    pub owner: String,
    #[wasm_bindgen(skip)]
    pub address: String,
    #[wasm_bindgen(skip)]
    pub inner: Arc<TokenWalletImpl>,
}

impl TokenWallet {
    pub fn new(
        transport: Arc<nt::transport::gql::GqlTransport>,
        wallet: token_wallet::TokenWallet,
    ) -> Self {
        Self {
            version: wallet.version().to_string(),
            symbol: wallet.symbol().clone(),
            owner: wallet.owner().to_string(),
            address: wallet.address().to_string(),
            inner: Arc::new(TokenWalletImpl {
                transport,
                wallet: Mutex::new(wallet),
            }),
        }
    }
}

#[wasm_bindgen]
impl TokenWallet {
    #[wasm_bindgen(js_name = "makeCollectTokensCall")]
    pub fn make_collect_tokens_call(
        eth_event_address: &str,
    ) -> Result<crate::core::InternalMessage, JsValue> {
        let eth_event_address = parse_address(eth_event_address)?;
        let internal_message = token_wallet::make_collect_tokens_call(eth_event_address);
        crate::core::make_internal_message(internal_message)
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
    pub fn address(&self) -> String {
        self.address.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn balance(&self) -> String {
        self.inner.wallet.lock().trust_me().balance().to_string()
    }

    #[wasm_bindgen(js_name = "prepareDeploy")]
    pub fn prepare_deploy(&self) -> Result<crate::core::InternalMessage, JsValue> {
        let wallet = self.inner.wallet.lock().trust_me();
        wallet
            .prepare_deploy()
            .handle_error()
            .and_then(crate::core::make_internal_message)
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
                .prepare_transfer(core_models::TransferRecipient::OwnerWallet(dest), tokens)
                .handle_error()?;

            crate::core::make_internal_message(message).map(JsValue::from)
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

            crate::core::make_internal_message(message).map(JsValue::from)
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
        let from = core_models::TransactionId {
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

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = "TokenWalletSubscriptionHandler")]
    pub type TokenWalletSubscriptionHandlerImpl;

    #[wasm_bindgen(method, js_name = "onBalanceChanged")]
    pub fn on_balance_changed(this: &TokenWalletSubscriptionHandlerImpl, balance: String);

    #[wasm_bindgen(method, js_name = "onTransactionsFound")]
    pub fn on_transactions_found(
        this: &TokenWalletSubscriptionHandlerImpl,
        transactions: TokenWalletTransactionsList,
        batch_info: crate::core::models::TransactionsBatchInfo,
    );
}

unsafe impl Send for TokenWalletSubscriptionHandlerImpl {}

unsafe impl Sync for TokenWalletSubscriptionHandlerImpl {}

pub struct TokenWalletSubscriptionHandler {
    inner: TokenWalletSubscriptionHandlerImpl,
}

impl From<TokenWalletSubscriptionHandlerImpl> for TokenWalletSubscriptionHandler {
    fn from(inner: TokenWalletSubscriptionHandlerImpl) -> Self {
        Self { inner }
    }
}

impl token_wallet::TokenWalletSubscriptionHandler for TokenWalletSubscriptionHandler {
    fn on_balance_changed(&self, balance: BigUint) {
        self.inner.on_balance_changed(balance.to_string());
    }

    fn on_transactions_found(
        &self,
        transactions: Vec<core_models::TransactionWithData<core_models::TokenWalletTransaction>>,
        batch_info: core_models::TransactionsBatchInfo,
    ) {
        use crate::core::models::*;

        self.inner.on_transactions_found(
            transactions
                .into_iter()
                .map(make_token_wallet_transaction)
                .map(JsValue::from)
                .collect::<js_sys::Array>()
                .unchecked_into(),
            make_transactions_batch_info(batch_info),
        );
    }
}

#[wasm_bindgen(typescript_custom_section)]
const TOKEN_WALLET_TRANSACTION: &str = r#"
export type TokenWalletTransaction = Transaction & { info?: TokenWalletTransactionInfo };
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TokenWalletTransaction")]
    pub type TokenWalletTransaction;
}

fn make_token_wallet_transaction(
    data: core_models::TransactionWithData<core_models::TokenWalletTransaction>,
) -> TokenWalletTransaction {
    let transaction = crate::core::models::make_transaction(data.transaction);
    if let Some(data) = data.data {
        js_sys::Reflect::set(
            &transaction,
            &JsValue::from_str("info"),
            &make_token_wallet_transaction_info(data),
        )
        .trust_me();
    }
    transaction.unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const TOKEN_WALLET_TRANSACTION_INFO: &str = r#"
export type TokenWalletTransactionInfo =
    | EnumItem<'incoming_transfer', { tokens: string, senderAddress: string }>
    | EnumItem<'outgoing_transfer', { to: TransferRecipient, tokens: string }>
    | EnumItem<'swap_back', { tokens: string, to: string }>
    | EnumItem<'accept', { tokens: string }>
    | EnumItem<'transfer_bounced', { tokens: string }>
    | EnumItem<'swap_back_bounced', { tokens: string }>;
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TokenWalletTransactionInfo")]
    pub type TokenWalletTransactionInfo;
}

fn make_token_wallet_transaction_info(
    data: core_models::TokenWalletTransaction,
) -> TokenWalletTransactionInfo {
    let (ty, data) = match data {
        core_models::TokenWalletTransaction::IncomingTransfer(transfer) => (
            "incoming_transfer",
            ObjectBuilder::new()
                .set("tokens", transfer.tokens.to_string())
                .set("senderAddress", transfer.sender_address.to_string())
                .build(),
        ),
        core_models::TokenWalletTransaction::OutgoingTransfer(transfer) => (
            "outgoing_transfer",
            ObjectBuilder::new()
                .set("to", make_transfer_recipient(transfer.to))
                .set("tokens", transfer.tokens.to_string())
                .build(),
        ),
        core_models::TokenWalletTransaction::SwapBack(swap_back) => (
            "swap_back",
            ObjectBuilder::new()
                .set("to", swap_back.to)
                .set("tokens", swap_back.tokens.to_string())
                .build(),
        ),
        core_models::TokenWalletTransaction::Accept(tokens) => (
            "accept",
            ObjectBuilder::new()
                .set("tokens", tokens.to_string())
                .build(),
        ),
        core_models::TokenWalletTransaction::TransferBounced(tokens) => (
            "transfer_bounced",
            ObjectBuilder::new()
                .set("tokens", tokens.to_string())
                .build(),
        ),
        core_models::TokenWalletTransaction::SwapBackBounced(tokens) => (
            "swap_back_bounced",
            ObjectBuilder::new()
                .set("tokens", tokens.to_string())
                .build(),
        ),
    };

    ObjectBuilder::new()
        .set("type", ty)
        .set("data", data)
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const TRANSFER_RECIPIENT: &str = r#"
export type TransferRecipient = {
    type: 'owner_wallet' | 'token_wallet',
    address: string,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TransferRecipient")]
    pub type TransferRecipient;
}

fn make_transfer_recipient(data: core_models::TransferRecipient) -> TransferRecipient {
    let (ty, address) = match data {
        core_models::TransferRecipient::OwnerWallet(address) => ("owner_wallet", address),
        core_models::TransferRecipient::TokenWallet(address) => ("token_wallet", address),
    };

    ObjectBuilder::new()
        .set("type", ty)
        .set("address", address.to_string())
        .build()
        .unchecked_into()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<InternalMessage>")]
    pub type PromiseInternalMessage;

    #[wasm_bindgen(typescript_type = "Array<TokenWalletTransaction>")]
    pub type TokenWalletTransactionsList;
}
