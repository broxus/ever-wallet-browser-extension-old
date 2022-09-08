use std::convert::{TryFrom, TryInto};
use std::sync::Arc;

use ton_block::Serializable;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use nt::transport;

use crate::core::token_wallet::RootTokenContractDetailsWithAddress;
use crate::utils::*;

pub mod gql;
pub mod jrpc;

pub trait IntoHandle: Sized {
    fn into_handle(self) -> TransportHandle;
}

#[derive(Clone)]
pub enum TransportHandle {
    GraphQl(Arc<transport::gql::GqlTransport>),
    Jrpc(Arc<transport::jrpc::JrpcTransport>),
}

impl TransportHandle {
    pub async fn get_block(&self, block_id: &str) -> Result<ton_block::Block, JsValue> {
        match self {
            Self::GraphQl(transport) => transport.get_block(block_id).await.handle_error(),
            _ => Err(TransportError::MethodNotSupported).handle_error(),
        }
    }
}

impl<'a> AsRef<dyn transport::Transport + 'a> for TransportHandle {
    fn as_ref(&self) -> &(dyn transport::Transport + 'a) {
        match self {
            Self::GraphQl(transport) => transport.as_ref(),
            Self::Jrpc(transport) => transport.as_ref(),
        }
    }
}

impl From<TransportHandle> for Arc<dyn transport::Transport> {
    fn from(handle: TransportHandle) -> Self {
        match handle {
            TransportHandle::GraphQl(transport) => transport,
            TransportHandle::Jrpc(transport) => transport,
        }
    }
}

#[wasm_bindgen]
pub struct Transport {
    #[wasm_bindgen(skip)]
    pub handle: TransportHandle,
    #[wasm_bindgen(skip)]
    pub clock: Arc<nt_utils::ClockWithOffset>,
}

#[wasm_bindgen]
impl Transport {
    #[wasm_bindgen(js_name = "fromGqlConnection")]
    pub fn from_gql_connection(gql: &gql::GqlConnection) -> Transport {
        let transport = Arc::new(nt::transport::gql::GqlTransport::new(gql.inner.clone()));
        Self {
            handle: TransportHandle::GraphQl(transport),
            clock: gql.clock.clone(),
        }
    }

    #[wasm_bindgen(js_name = "fromJrpcConnection")]
    pub fn from_jrpc_connection(jrpc: &jrpc::JrpcConnection) -> Transport {
        let transport = Arc::new(nt::transport::jrpc::JrpcTransport::new(jrpc.inner.clone()));
        Self {
            handle: TransportHandle::Jrpc(transport),
            clock: jrpc.clock.clone(),
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
        let handle = self.handle.clone();
        let handler = Arc::new(GenericContractSubscriptionHandler::from(handler));

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = nt::core::generic_contract::GenericContract::subscribe(
                clock,
                handle.clone().into(),
                address,
                handler,
                false,
            )
            .await
            .handle_error()?;

            Ok(JsValue::from(GenericContract::new(handle, wallet)))
        })))
    }

    #[wasm_bindgen(js_name = "subscribeToNativeWallet")]
    pub fn subscribe_to_native_wallet(
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
        let handle = self.handle.clone();
        let handler = Arc::new(TonWalletSubscriptionHandler::from(handler));

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = nt::core::ton_wallet::TonWallet::subscribe(
                clock,
                handle.clone().into(),
                workchain,
                public_key,
                contract_type,
                handler,
            )
            .await
            .handle_error()?;

            Ok(JsValue::from(TonWallet::new(handle, wallet)))
        })))
    }

    #[wasm_bindgen(js_name = "subscribeToNativeWalletByAddress")]
    pub fn subscribe_to_native_wallet_by_address(
        &self,
        address: &str,
        handler: crate::core::ton_wallet::TonWalletSubscriptionHandlerImpl,
    ) -> Result<PromiseTonWallet, JsValue> {
        use crate::core::ton_wallet::*;

        let address = parse_address(address)?;

        let clock = self.clock.clone();
        let handle = self.handle.clone();
        let handler = Arc::new(TonWalletSubscriptionHandler::from(handler));

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = nt::core::ton_wallet::TonWallet::subscribe_by_address(
                clock,
                handle.clone().into(),
                address,
                handler,
            )
            .await
            .handle_error()?;

            Ok(JsValue::from(TonWallet::new(handle, wallet)))
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
        let handle = self.handle.clone();
        let handler = Arc::new(TokenWalletSubscriptionHandler::from(handler));

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let wallet = nt::core::token_wallet::TokenWallet::subscribe(
                clock,
                handle.clone().into(),
                owner,
                root_token_contract,
                handler,
            )
            .await
            .handle_error()?;

            Ok(JsValue::from(TokenWallet::new(handle, wallet)))
        })))
    }

    #[wasm_bindgen(js_name = "findExistingWallets")]
    pub fn find_existing_wallets(
        &self,
        public_key: &str,
        workchain_id: i8,
        contract_types: crate::core::ton_wallet::ContractTypeList,
    ) -> Result<PromiseExistingWalletInfoList, JsValue> {
        let public_key = parse_public_key(public_key)?;

        if !js_sys::Array::is_array(&contract_types) {
            return Err("contract_types must be an array").handle_error()?;
        }
        let contract_types: js_sys::Array = contract_types.unchecked_into();

        let wallet_types = contract_types
            .iter()
            .map(|item| {
                let item: crate::core::ton_wallet::ContractType = item.unchecked_into();
                item.try_into()
            })
            .collect::<Result<Vec<nt::core::ton_wallet::WalletType>, _>>()?;

        let handle = self.handle.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let result = nt::core::ton_wallet::find_existing_wallets(
                handle.as_ref(),
                &public_key,
                workchain_id,
                &wallet_types,
            )
            .await
            .handle_error()?;

            Ok(result
                .into_iter()
                .map(make_existing_wallet_info)
                .collect::<js_sys::Array>()
                .unchecked_into())
        })))
    }

    #[wasm_bindgen(js_name = "getNativeWalletInitData")]
    pub fn get_native_wallet_init_data(
        &self,
        address: &str,
    ) -> Result<PromiseTonWalletInitData, JsValue> {
        let address = parse_address(address)?;
        let clock = self.clock.clone();
        let handle = self.handle.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let contract = match handle
                .as_ref()
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
        let handle = self.handle.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            crate::core::token_wallet::get_token_root_details_with_user_token_wallet(
                clock.as_ref(),
                handle.as_ref(),
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
        let handle = self.handle.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            crate::core::token_wallet::get_token_wallet_balance(
                clock.as_ref(),
                handle.as_ref(),
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
        let handle = self.handle.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let (address, details) =
                nt::core::token_wallet::get_token_root_details_from_token_wallet(
                    clock.as_ref(),
                    handle.as_ref(),
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
        let handle = self.handle.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            make_full_contract_state(
                handle
                    .as_ref()
                    .get_contract_state(&address)
                    .await
                    .handle_error()?,
            )
        })))
    }

    #[wasm_bindgen(js_name = "getAccountsByCodeHash")]
    pub fn get_accounts_by_code_hash(
        &self,
        code_hash: &str,
        limit: u8,
        continuation: Option<String>,
    ) -> Result<PromiseAccountsList, JsValue> {
        let code_hash = parse_hash(code_hash)?;
        let continuation = continuation.map(|addr| parse_address(&addr)).transpose()?;
        let handle = self.handle.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            Ok(make_accounts_list(
                handle
                    .as_ref()
                    .get_accounts_by_code_hash(&code_hash, limit, &continuation)
                    .await
                    .handle_error()?,
            )
            .unchecked_into())
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
        let before_lt = continuation
            .map(parse_transaction_id)
            .transpose()?
            .map(|id| id.lt);
        let handle = self.handle.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let raw_transactions = handle
                .as_ref()
                .get_transactions(&address, before_lt.unwrap_or(u64::MAX), limit)
                .await
                .handle_error()?;
            Ok(make_transactions_list(raw_transactions).unchecked_into())
        })))
    }

    #[wasm_bindgen(js_name = "getTransaction")]
    pub fn get_transaction(&self, hash: &str) -> Result<PromiseOptionTransaction, JsValue> {
        let hash = parse_hash(hash)?;
        let handle = self.handle.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            Ok(
                match handle
                    .as_ref()
                    .get_transaction(&hash)
                    .await
                    .handle_error()?
                {
                    Some(transaction) => nt::core::models::Transaction::try_from((
                        transaction.hash,
                        transaction.data,
                    ))
                    .map(crate::core::models::make_transaction)
                    .handle_error()?
                    .unchecked_into(),
                    None => JsValue::undefined(),
                },
            )
        })))
    }

    #[wasm_bindgen(js_name = "getDstTransaction")]
    pub fn get_dst_transaction(
        &self,
        message_hash: &str,
    ) -> Result<PromiseOptionTransaction, JsValue> {
        let message_hash = parse_hash(message_hash)?;
        let handle = self.handle.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            Ok(
                match handle
                    .as_ref()
                    .get_dst_transaction(&message_hash)
                    .await
                    .handle_error()?
                {
                    Some(transaction) => nt::core::models::Transaction::try_from((
                        transaction.hash,
                        transaction.data,
                    ))
                    .map(crate::core::models::make_transaction)
                    .handle_error()?
                    .unchecked_into(),
                    None => JsValue::undefined(),
                },
            )
        })))
    }
}

#[wasm_bindgen(typescript_custom_section)]
const TON_WALLET_INIT_DATA: &'static str = r#"
export type TonWalletInitData = {
    publicKey: string,
    contractType: ContractType,
    workchain: number,
    custodians: string[],
};
"#;

fn make_ton_wallet_init_data(
    public_key: ed25519_dalek::PublicKey,
    contract_type: nt::core::ton_wallet::WalletType,
    workchain: i8,
    custodians: Vec<ton_types::UInt256>,
) -> JsValue {
    ObjectBuilder::new()
        .set("publicKey", hex::encode(public_key.as_bytes()))
        .set(
            "contractType",
            crate::core::ton_wallet::ContractType::from(contract_type),
        )
        .set("workchain", workchain)
        .set(
            "custodians",
            custodians
                .into_iter()
                .map(|custodian| JsValue::from(custodian.to_hex_string()))
                .collect::<js_sys::Array>(),
        )
        .build()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<TonWalletInitData>")]
    pub type PromiseTonWalletInitData;
}

#[wasm_bindgen(typescript_custom_section)]
const ROOT_TOKEN_CONTRACT_DETAILS: &'static str = r#"
export type RootTokenContractDetails = {
    address: string,
    name: string,
    symbol: string,
    decimals: number,
    version: TokenWalletVersion,
};
"#;

fn make_root_token_contract_details(
    address: ton_block::MsgAddressInt,
    details: nt::core::models::RootTokenContractDetails,
) -> JsValue {
    ObjectBuilder::new()
        .set("address", address.to_string())
        .set("name", details.name)
        .set("symbol", details.symbol)
        .set("decimals", details.decimals)
        .set("version", details.version.to_string())
        .build()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<RootTokenContractDetails>")]
    pub type PromiseRootTokenContractDetails;
}

#[wasm_bindgen(typescript_custom_section)]
const ACCOUNTS_LIST: &'static str = r#"
export type AccountsList = {
  accounts: string[];
  continuation: string | undefined;
}
"#;

pub fn make_accounts_list(accounts: Vec<ton_block::MsgAddressInt>) -> AccountsList {
    ObjectBuilder::new()
        .set("continuation", accounts.last().map(ToString::to_string))
        .set(
            "accounts",
            accounts
                .into_iter()
                .map(|account| JsValue::from(account.to_string()))
                .collect::<js_sys::Array>(),
        )
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const TRANSACTIONS_LIST: &'static str = r#"
export type TransactionsList = {
    transactions: Transaction[];
    continuation: TransactionId | undefined;
};
"#;

pub fn make_transactions_list(
    raw_transactions: Vec<nt::transport::models::RawTransaction>,
) -> TransactionsList {
    let batch_info = match (raw_transactions.first(), raw_transactions.last()) {
        (Some(first), Some(last)) => Some(nt::core::models::TransactionsBatchInfo {
            min_lt: last.data.lt, // transactions in response are in descending order
            max_lt: first.data.lt,
            batch_type: nt::core::models::TransactionsBatchType::New,
        }),
        _ => None,
    };

    let continuation = raw_transactions.last().and_then(|transaction| {
        (transaction.data.prev_trans_lt != 0).then(|| nt_abi::TransactionId {
            lt: transaction.data.prev_trans_lt,
            hash: transaction.data.prev_trans_hash,
        })
    });
    ObjectBuilder::new()
        .set(
            "transactions",
            raw_transactions
                .into_iter()
                .filter_map(|transaction| {
                    nt::core::models::Transaction::try_from((transaction.hash, transaction.data))
                        .ok()
                })
                .map(crate::core::models::make_transaction)
                .collect::<js_sys::Array>(),
        )
        .set(
            "continuation",
            continuation.map(crate::core::models::make_transaction_id),
        )
        .set(
            "info",
            batch_info.map(crate::core::models::make_transactions_batch_info),
        )
        .build()
        .unchecked_into()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "AccountsList")]
    pub type AccountsList;

    #[wasm_bindgen(typescript_type = "Promise<AccountsList>")]
    pub type PromiseAccountsList;

    #[wasm_bindgen(typescript_type = "TransactionsList")]
    pub type TransactionsList;

    #[wasm_bindgen(typescript_type = "Promise<TransactionsList>")]
    pub type PromiseTransactionsList;

    #[wasm_bindgen(typescript_type = "Promise<Transaction>")]
    pub type PromiseTransaction;

    #[wasm_bindgen(typescript_type = "Promise<Transaction | undefined>")]
    pub type PromiseOptionTransaction;
}

#[wasm_bindgen(typescript_custom_section)]
const TRANSPORT_INFO: &'static str = r#"
export type ReliableBahavior =
    | 'intensive_polling'
    | 'block_walking';

export type TransportInfo = {
    maxTransactionsPerFetch: number;
    reliableBehavior: ReliableBehavior;
};
"#;

pub fn make_transport_info(data: transport::TransportInfo) -> TransportInfo {
    ObjectBuilder::new()
        .set("maxTransactionsPerFetch", data.max_transactions_per_fetch)
        .set("reliableBehavior", data.reliable_behavior.to_string())
        .build()
        .unchecked_into()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TransportInfo")]
    pub type TransportInfo;
}

#[wasm_bindgen(typescript_custom_section)]
const EXISTING_WALLET_INFO: &'static str = r#"
export type ExistingWalletInfo = {
    address: string,
    publicKey: string,
    contractType: ContractType,
    contractState: ContractState,
};
"#;

pub fn make_existing_wallet_info(data: nt::core::ton_wallet::ExistingWalletInfo) -> JsValue {
    ObjectBuilder::new()
        .set("address", data.address.to_string())
        .set("publicKey", hex::encode(data.public_key.as_bytes()))
        .set(
            "contractType",
            crate::core::ton_wallet::ContractType::from(data.wallet_type),
        )
        .set(
            "contractState",
            crate::core::models::make_contract_state(data.contract_state),
        )
        .build()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<Array<ExistingWalletInfo>>")]
    pub type PromiseExistingWalletInfoList;
}

#[wasm_bindgen(typescript_custom_section)]
const FULL_CONTRACT_STATE: &'static str = r#"
export type FullContractState = {
    balance: string;
    genTimings: GenTimings;
    lastTransactionId: LastTransactionId;
    isDeployed: boolean;
    codeHash?: string;
    boc: string;
};
"#;

pub fn make_full_contract_state(
    contract_state: nt::transport::models::RawContractState,
) -> Result<JsValue, JsValue> {
    use crate::core::models::*;

    match contract_state {
        nt::transport::models::RawContractState::Exists(state) => {
            let code_hash = match &state.account.storage.state {
                ton_block::AccountState::AccountActive {
                    state_init:
                        ton_block::StateInit {
                            code: Some(code), ..
                        },
                } => Some(code.repr_hash().to_hex_string()),
                _ => None,
            };

            let account_cell = state.account.serialize().handle_error()?;
            let boc = ton_types::serialize_toc(&account_cell)
                .map(base64::encode)
                .handle_error()?;

            Ok(ObjectBuilder::new()
                .set("balance", state.account.storage.balance.grams.0.to_string())
                .set("genTimings", make_gen_timings(state.timings))
                .set(
                    "lastTransactionId",
                    make_last_transaction_id(state.last_transaction_id),
                )
                .set(
                    "isDeployed",
                    matches!(
                        &state.account.storage.state,
                        ton_block::AccountState::AccountActive { .. }
                    ),
                )
                .set("codeHash", code_hash)
                .set("boc", boc)
                .build()
                .unchecked_into())
        }
        nt::transport::models::RawContractState::NotExists => Ok(JsValue::undefined()),
    }
}

#[derive(thiserror::Error, Debug)]
enum TransportError {
    #[error("Method not supported")]
    MethodNotSupported,
    #[error("Wallet not deployed")]
    WalletNotDeployed,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<GenericContract>")]
    pub type PromiseGenericContract;

    #[wasm_bindgen(typescript_type = "Promise<TonWallet>")]
    pub type PromiseTonWallet;

    #[wasm_bindgen(typescript_type = "Promise<TokenWallet>")]
    pub type PromiseTokenWallet;

    #[wasm_bindgen(typescript_type = "Promise<FullContractState | undefined>")]
    pub type PromiseOptionFullContractState;
}
