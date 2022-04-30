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
    pub inner: Arc<nt::core::accounts_storage::AccountsStorage>,
}

#[wasm_bindgen]
impl AccountsStorage {
    #[wasm_bindgen]
    pub fn verify(data: &str) -> bool {
        nt::core::accounts_storage::AccountsStorage::verify(data).is_ok()
    }

    #[wasm_bindgen]
    pub fn load(storage: &crate::external::Storage) -> PromiseAccountsStorage {
        let storage = storage.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let inner = Arc::new(
                nt::core::accounts_storage::AccountsStorage::load(
                    storage as Arc<dyn nt::external::Storage>,
                )
                .await
                .handle_error()?,
            );

            Ok(JsValue::from(Self { inner }))
        }))
    }

    #[wasm_bindgen]
    pub fn reload(&self) -> PromiseVoid {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            inner.reload().await.handle_error()?;
            Ok(JsValue::undefined())
        }))
    }

    #[wasm_bindgen(js_name = "addAccount")]
    pub fn add_account(&self, new_account: AccountToAdd) -> Result<PromiseAssetsList, JsValue> {
        let account = parse_account_to_add(new_account.unchecked_into())?;

        let inner = self.inner.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let assets_list = inner.add_account(account).await.handle_error()?;
            Ok(make_assets_list(assets_list).unchecked_into())
        })))
    }

    #[wasm_bindgen(js_name = "addAccounts")]
    pub fn add_accounts(
        &self,
        new_accounts: AccountToAddList,
    ) -> Result<PromiseAssetsListList, JsValue> {
        if js_sys::Array::is_array(&new_accounts) {
            return Err("Expected new_accounts to be an array").handle_error();
        }
        let new_accounts: js_sys::Array = new_accounts.unchecked_into();
        let new_accounts = new_accounts
            .iter()
            .map(parse_account_to_add)
            .collect::<Result<Vec<_>, _>>()?;

        let inner = self.inner.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let assets_list = inner.add_accounts(new_accounts).await.handle_error()?;
            Ok(assets_list
                .into_iter()
                .map(make_assets_list)
                .collect::<js_sys::Array>()
                .unchecked_into())
        })))
    }

    #[wasm_bindgen(js_name = "renameAccount")]
    pub fn rename_account(
        &self,
        account: String,
        name: String,
    ) -> Result<PromiseAssetsList, JsValue> {
        let inner = self.inner.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let assets_list = inner.rename_account(&account, name).await.handle_error()?;
            Ok(JsValue::from(make_assets_list(assets_list)))
        })))
    }

    #[wasm_bindgen(js_name = "addTokenWallet")]
    pub fn add_token_wallet(
        &self,
        account: String,
        network_group: String,
        root_token_contract: String,
    ) -> Result<PromiseAssetsList, JsValue> {
        let inner = self.inner.clone();
        let root_token_contract = parse_address(&root_token_contract)?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let assets_list = inner
                .add_token_wallet(&account, &network_group, root_token_contract)
                .await
                .handle_error()?;
            Ok(JsValue::from(make_assets_list(assets_list)))
        })))
    }

    #[wasm_bindgen(js_name = "removeTokenWallet")]
    pub fn remove_token_wallet(
        &self,
        account: String,
        network_group: String,
        root_token_contract: String,
    ) -> Result<PromiseAssetsList, JsValue> {
        let inner = self.inner.clone();
        let root_token_contract = parse_address(&root_token_contract)?;

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let assets_list = inner
                .remove_token_wallet(&account, &network_group, &root_token_contract)
                .await
                .handle_error()?;
            Ok(JsValue::from(make_assets_list(assets_list)))
        })))
    }

    #[wasm_bindgen(js_name = "removeAccount")]
    pub fn remove_account(&self, account: String) -> PromiseOptionAssetsList {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let assets_list = inner.remove_account(&account).await.handle_error()?;
            Ok(JsValue::from(assets_list.map(make_assets_list)))
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
    pub fn get_account(&self, account: String) -> PromiseOptionAssetsList {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let state = inner.stored_data().await;
            Ok(JsValue::from(
                state
                    .accounts()
                    .get(&account)
                    .cloned()
                    .map(make_assets_list),
            ))
        }))
    }

    #[wasm_bindgen(js_name = "getStoredAccounts")]
    pub fn get_stored_accounts(&self) -> PromiseAssetsListList {
        let inner = self.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let state = inner.stored_data().await;
            Ok(state
                .accounts()
                .iter()
                .map(|(_, assets)| make_assets_list(assets.clone()))
                .map(JsValue::from)
                .collect::<js_sys::Array>()
                .unchecked_into())
        }))
    }
}

#[wasm_bindgen(typescript_custom_section)]
const ACCOUNT_TO_ADD: &str = r#"
export type AccountToAdd = {
    name: string,
    publicKey: string,
    contractType: ContractType,
    workchain: number,
    explicitAddress?: string,
}
"#;

#[wasm_bindgen(typescript_custom_section)]
extern "C" {
    #[wasm_bindgen(typescript_type = "AccountToAdd")]
    pub type AccountToAdd;

    #[wasm_bindgen(typescript_type = "Array<AccountToAdd>")]
    pub type AccountToAddList;
}

fn parse_account_to_add(
    data: JsValue,
) -> Result<nt::core::accounts_storage::AccountToAdd, JsValue> {
    if !data.is_object() {
        return Err("Object expected").handle_error();
    }

    let name = match js_sys::Reflect::get(&data, &JsValue::from_str("name"))
        .as_ref()
        .map(JsValue::as_string)?
    {
        Some(name) => name,
        None => return Err("name is required").handle_error(),
    };

    let public_key = match js_sys::Reflect::get(&data, &JsValue::from_str("publicKey"))
        .as_ref()
        .map(JsValue::as_string)?
    {
        Some(public_key) => parse_public_key(&public_key)?,
        None => return Err("publicKey is required").handle_error(),
    };

    let contract = js_sys::Reflect::get(&data, &JsValue::from_str("contractType"))?
        .unchecked_into::<crate::core::ton_wallet::ContractType>()
        .try_into()?;

    let workchain = match js_sys::Reflect::get(&data, &JsValue::from_str("workchain"))
        .as_ref()
        .map(JsValue::as_f64)?
    {
        Some(workchain) => workchain as i8,
        None => return Err("workchain is required").handle_error(),
    };

    let explicit_address = {
        let value = js_sys::Reflect::get(&data, &JsValue::from_str("explicitAddress"))?;
        if value.is_null() || value.is_undefined() {
            None
        } else {
            match value.as_string() {
                Some(explicit_address) => Some(parse_address(&explicit_address)?),
                None => return Err("explicitAddress must be a string").handle_error(),
            }
        }
    };

    Ok(nt::core::accounts_storage::AccountToAdd {
        name,
        public_key,
        contract,
        workchain,
        explicit_address,
    })
}

#[wasm_bindgen(typescript_custom_section)]
const ASSETS_LIST: &str = r#"
export type AssetsList = {
    name: string,
    tonWallet: TonWalletAsset,
    additionalAssets: {
        [networkGroup: string]: AdditionalAssets
    }
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "AssetsList")]
    pub type AssetsList;
}

fn make_assets_list(data: nt::core::accounts_storage::AssetsList) -> AssetsList {
    ObjectBuilder::new()
        .set("name", data.name)
        .set("tonWallet", make_ton_wallet_asset(data.ton_wallet))
        .set("additionalAssets", {
            let mut result = ObjectBuilder::new();
            for (network_group, additional_assets) in data.additional_assets.into_iter() {
                result = result.set(&network_group, make_additional_assets(additional_assets));
            }
            result.build()
        })
        .build()
        .unchecked_into()
}

#[wasm_bindgen(typescript_custom_section)]
const ADDITIONAL_ASSETS: &str = r#"
export type AdditionalAssets = {
    tokenWallets: TokenWalletAsset[],
    depools: DePoolAsset[],
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "AdditionalAssets")]
    pub type AdditionalAssets;
}

fn make_additional_assets(data: nt::core::accounts_storage::AdditionalAssets) -> AdditionalAssets {
    ObjectBuilder::new()
        .set(
            "tokenWallets",
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

fn make_ton_wallet_asset(data: nt::core::accounts_storage::TonWalletAsset) -> TonWalletAsset {
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
    rootTokenContract: string,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TokenWalletAsset")]
    pub type TokenWalletAsset;
}

fn make_token_wallet_asset(data: nt::core::accounts_storage::TokenWalletAsset) -> TokenWalletAsset {
    ObjectBuilder::new()
        .set("rootTokenContract", data.root_token_contract.to_string())
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

fn make_depool_asset(data: nt::core::accounts_storage::DePoolAsset) -> DePoolAsset {
    ObjectBuilder::new()
        .set("address", data.address.to_string())
        .build()
        .unchecked_into()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<Array<AssetsList>>")]
    pub type PromiseAssetsListList;

    #[wasm_bindgen(typescript_type = "Promise<AssetsList | undefined>")]
    pub type PromiseOptionAssetsList;

    #[wasm_bindgen(typescript_type = "Promise<AccountsStorage>")]
    pub type PromiseAccountsStorage;

    #[wasm_bindgen(typescript_type = "Promise<AssetsList>")]
    pub type PromiseAssetsList;

}
