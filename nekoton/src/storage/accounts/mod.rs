use std::convert::TryInto;
use std::sync::Arc;

use anyhow::Result;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use crate::utils::*;

#[wasm_bindgen]
pub struct AccountsStorage {
    #[wasm_bindgen(skip)]
    pub inner: Arc<nt::storage::AccountsStorage>,
}

#[wasm_bindgen]
impl AccountsStorage {
    #[wasm_bindgen]
    pub fn load(storage: &crate::storage::Storage) -> PromiseAccountsStorage {
        let storage = storage.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let inner = Arc::new(
                nt::storage::AccountsStorage::load(storage as Arc<dyn nt::external::Storage>)
                    .await
                    .handle_error()?,
            );

            Ok(JsValue::from(Self { inner }))
        }))
    }

    #[wasm_bindgen(js_name = "addAccount")]
    pub fn add_account(
        &self,
        name: String,
        public_key: &str,
        contract_type: crate::core::ton_wallet::ContractType,
        update_current: bool,
    ) -> Result<PromiseString, JsValue> {
        let public_key = parse_public_key(public_key)?;
        let contract_type = contract_type.try_into()?;

        let inner = self.inner.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let address = inner
                .add_account(&name, public_key, contract_type, update_current)
                .await
                .handle_error()?;
            Ok(JsValue::from(address))
        })))
    }

    #[wasm_bindgen(js_name = "removeAccount")]
    pub fn remove_account(&self, address: String) -> PromiseVoid {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            inner.remove_account(&address).await.handle_error()?;
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen]
    pub fn clear(&self) -> PromiseVoid {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            inner.clear().await.handle_error()?;
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(js_name = "getAccount")]
    pub fn get_account(&self, address: String) -> PromiseOptionAssetsList {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let state = inner.stored_data().await;
            Ok(JsValue::from(
                state
                    .accounts()
                    .get(&address)
                    .cloned()
                    .map(make_assets_list),
            ))
        }))
    }

    #[wasm_bindgen(js_name = "getStoredAccounts")]
    pub fn get_stored_accounts(&self) -> PromiseStoredAccountsEntriesList {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let state = inner.stored_data().await;
            Ok(state
                .accounts()
                .iter()
                .map(|(address, assets)| {
                    make_account_storage_entry(
                        address.clone(),
                        assets.name.clone(),
                        hex::encode(assets.ton_wallet.public_key.as_bytes()),
                        assets.ton_wallet.contract.into(),
                    )
                })
                .map(JsValue::from)
                .collect::<js_sys::Array>()
                .unchecked_into())
        }))
    }

    #[wasm_bindgen(js_name = "setCurrentAccount")]
    pub fn set_current_account(&self, address: String) -> PromiseVoid {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            inner.set_current_account(&address).await.handle_error()?;
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(js_name = "getCurrentAccount")]
    pub fn get_current_account(&self) -> PromiseOptionString {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let stored_data = inner.stored_data().await;
            Ok(stored_data
                .current_account()
                .clone()
                .map(JsValue::from)
                .unwrap_or_else(JsValue::undefined))
        }))
    }
}

#[wasm_bindgen(typescript_custom_section)]
const ACCOUNT_STORAGE_ENTRY: &str = r#"
export type AccountsStorageEntry = {
    address: string,
    name: string,
    publicKey: string,
    contractType: ContractType,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "AccountsStorageEntry")]
    pub type AccountsStorageEntry;
}

pub fn make_account_storage_entry(
    address: String,
    name: String,
    public_key: String,
    contract_type: crate::core::ton_wallet::ContractType,
) -> AccountsStorageEntry {
    ObjectBuilder::new()
        .set("address", address)
        .set("name", name)
        .set("publicKey", public_key)
        .set("contractType", contract_type)
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const ASSETS_LIST: &str = r#"
export type AssetsList = {
    name: string,
    tonWallet: TonWalletAsset,
    tokenWallets: TokenWalletAsset[],
    depools: DePoolAsset[],
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "AssetsList")]
    pub type AssetsList;
}

fn make_assets_list(data: nt::storage::AssetsList) -> AssetsList {
    ObjectBuilder::new()
        .set("name", data.name)
        .set("tonWallet", make_ton_wallet_asset(data.ton_wallet))
        .set(
            "tokenWallet",
            data.token_wallets
                .into_iter()
                .map(make_token_wallet_asset)
                .map(JsValue::from)
                .collect::<js_sys::Array>(),
        )
        .set(
            "depools",
            data.depools
                .into_iter()
                .map(make_depool_asset)
                .map(JsValue::from)
                .collect::<js_sys::Array>(),
        )
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const TON_WALLET_ASSET: &str = r#"
export type TonWalletAsset = {
    address: string,
    publicKey: string,
    contractType: ContractType,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TonWalletAsset")]
    pub type TonWalletAsset;
}

fn make_ton_wallet_asset(data: nt::storage::TonWalletAsset) -> TonWalletAsset {
    ObjectBuilder::new()
        .set("address", data.address.to_string())
        .set("publicKey", hex::encode(data.public_key.as_bytes()))
        .set(
            "contractType",
            crate::core::ton_wallet::ContractType::from(data.contract),
        )
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const MESSAGE: &str = r#"
export type TokenWalletAsset = {
    symbol: Symbol,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TokenWalletAsset")]
    pub type TokenWalletAsset;
}

fn make_token_wallet_asset(data: nt::storage::TokenWalletAsset) -> TokenWalletAsset {
    use crate::core::models::*;
    ObjectBuilder::new()
        .set("symbol", make_symbol(data.symbol))
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const DEPOOL_ASSET: &str = r#"
export type DePoolAsset = {
    address: string,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "DePoolAsset")]
    pub type DePoolAsset;
}

fn make_depool_asset(data: nt::storage::DePoolAsset) -> DePoolAsset {
    ObjectBuilder::new()
        .set("address", data.address.to_string())
        .build()
        .unchecked_into()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<Array<AccountsStorageEntry>>")]
    pub type PromiseStoredAccountsEntriesList;

    #[wasm_bindgen(typescript_type = "Promise<AssetsList | undefined>")]
    pub type PromiseOptionAssetsList;

    #[wasm_bindgen(typescript_type = "Promise<AccountsStorage>")]
    pub type PromiseAccountsStorage;

    #[wasm_bindgen(typescript_type = "Promise<AssetsList>")]
    pub type PromiseAssetsList;
}
