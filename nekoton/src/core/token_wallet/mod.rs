use std::str::FromStr;
use std::sync::{Arc, Mutex};

use num_bigint::BigUint;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use nt::core::models as core_models;
use nt::core::token_wallet;
use nt_abi as abi;
use nt_utils::TrustMe;

use crate::transport::TransportHandle;
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
    pub fn new(transport: TransportHandle, wallet: token_wallet::TokenWallet) -> Self {
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

    #[wasm_bindgen(js_name = "prepareTransfer")]
    pub fn prepare_transfer(
        &self,
        dest: &str,
        tokens: &str,
        body: &str,
        notify_receiver: bool,
    ) -> Result<PromiseInternalMessage, JsValue> {
        let dest = parse_address(dest)?;
        let tokens = BigUint::from_str(tokens).handle_error()?;
        let payload = if !body.is_empty() {
            parse_slice(body)?.into_cell()
        } else {
            Default::default()
        };

        let inner = self.inner.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = inner.wallet.lock().trust_me();

            // TODO: resolve token wallet by owner and send directly
            let message = wallet
                .prepare_transfer(
                    core_models::TransferRecipient::OwnerWallet(dest),
                    tokens,
                    notify_receiver,
                    payload,
                )
                .handle_error()?;

            crate::core::make_internal_message(message).map(JsValue::from)
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
}

pub struct TokenWalletImpl {
    transport: TransportHandle,
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
    | EnumItem<'swap_back', { tokens: string, callbackAddress: string }>
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
                .set(
                    "to",
                    crate::core::models::make_transfer_recipient(transfer.to),
                )
                .set("tokens", transfer.tokens.to_string())
                .build(),
        ),
        core_models::TokenWalletTransaction::SwapBack(swap_back) => (
            "swap_back",
            ObjectBuilder::new()
                .set("tokens", swap_back.tokens.to_string())
                .set("callbackAddress", swap_back.callback_address.to_string())
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
const ROOT_TOKEN_CONTRACT_DETAILS_WITH_ADDRESS: &'static str = r#"
export type RootTokenContractDetailsWithAddress = {
    address: string,
    name: string,
    symbol: string,
    decimals: number,
    tokenWallet: string,
};
"#;

fn make_root_token_contract_details_with_address(
    root_token_contract: &ton_block::MsgAddressInt,
    details: nt::core::models::RootTokenContractDetails,
    token_wallet: &ton_block::MsgAddressInt,
) -> JsValue {
    ObjectBuilder::new()
        .set("address", root_token_contract.to_string())
        .set("name", details.name)
        .set("symbol", details.symbol)
        .set("decimals", details.decimals)
        .set("tokenWallet", token_wallet.to_string())
        .build()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "RootTokenContractDetailsWithAddress")]
    pub type RootTokenContractDetailsWithAddress;

    #[wasm_bindgen(typescript_type = "Promise<RootTokenContractDetailsWithAddress>")]
    pub type PromiseRootTokenContractDetailsWithAddress;
}

pub async fn get_token_root_details_with_user_token_wallet(
    clock: &dyn nt_utils::Clock,
    transport: &dyn nt::transport::Transport,
    root_token_contract: &ton_block::MsgAddressInt,
    owner: &ton_block::MsgAddressInt,
) -> Result<RootTokenContractDetailsWithAddress, JsValue> {
    let root_contract_state = match transport
        .get_contract_state(root_token_contract)
        .await
        .handle_error()?
    {
        nt::transport::models::RawContractState::Exists(state) => state,
        nt::transport::models::RawContractState::NotExists => {
            return Err("Invalid root token contract").handle_error()
        }
    };
    let root_contract_state = nt::core::token_wallet::RootTokenContractState(&root_contract_state);

    let details = root_contract_state.guess_details(clock).handle_error()?;
    let token_wallet = root_contract_state
        .get_wallet_address(clock, details.version, owner)
        .handle_error()?;

    Ok(
        make_root_token_contract_details_with_address(root_token_contract, details, &token_wallet)
            .unchecked_into(),
    )
}

pub async fn get_token_wallet_balance(
    clock: &dyn nt_utils::Clock,
    transport: &dyn nt::transport::Transport,
    token_wallet: &ton_block::MsgAddressInt,
) -> Result<String, JsValue> {
    let token_wallet_state = match transport
        .get_contract_state(token_wallet)
        .await
        .handle_error()?
    {
        nt::transport::models::RawContractState::Exists(state) => state,
        nt::transport::models::RawContractState::NotExists => return Ok(0.to_string()),
    };
    let token_wallet_state = nt::core::token_wallet::TokenWalletContractState(&token_wallet_state);

    let version = token_wallet_state.get_version(clock).handle_error()?;
    let balance = token_wallet_state
        .get_balance(clock, version)
        .handle_error()?;
    Ok(balance.to_string())
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<InternalMessage>")]
    pub type PromiseInternalMessage;

    #[wasm_bindgen(typescript_type = "Array<TokenWalletTransaction>")]
    pub type TokenWalletTransactionsList;
}
