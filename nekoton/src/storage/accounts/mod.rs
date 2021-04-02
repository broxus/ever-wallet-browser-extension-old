use std::convert::TryInto;
use std::sync::Arc;

use anyhow::Result;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use libnekoton::contracts::wallet;
use libnekoton::storage::{self, accounts};

use crate::utils::*;

#[wasm_bindgen]
pub struct AccountsStorage {
    #[wasm_bindgen(skip)]
    pub inner: Arc<accounts::AccountsStorage>,
}

#[wasm_bindgen]
impl AccountsStorage {
    #[wasm_bindgen]
    pub fn load(storage: &crate::storage::Storage) -> PromiseAccountsStorage {
        let storage = storage.inner.clone();

        JsCast::unchecked_into(future_to_promise(async move {
            let inner = Arc::new(
                accounts::AccountsStorage::load(storage as Arc<dyn storage::Storage>)
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
        contract_type: crate::core::ContractType,
        update_current: bool,
    ) -> Result<PromiseString, JsValue> {
        let public_key =
            ed25519_dalek::PublicKey::from_bytes(&hex::decode(public_key).handle_error()?)
                .handle_error()?;
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
                    .map(|inner| AssetsList { inner }),
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
                .map(|(address, assets)| AccountsStorageEntry {
                    address: address.clone(),
                    name: assets.name.clone(),
                    public_key: hex::encode(assets.ton_wallet.public_key.as_bytes()),
                    contract_type: assets.ton_wallet.contract,
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

#[wasm_bindgen]
pub struct AccountsStorageEntry {
    #[wasm_bindgen(skip)]
    pub address: String,
    #[wasm_bindgen(skip)]
    pub name: String,
    #[wasm_bindgen(skip)]
    pub public_key: String,
    #[wasm_bindgen(skip)]
    pub contract_type: wallet::ContractType,
}

#[wasm_bindgen]
impl AccountsStorageEntry {
    #[wasm_bindgen(getter)]
    pub fn address(&self) -> String {
        self.address.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.name.clone()
    }

    #[wasm_bindgen(getter, js_name = "publicKey")]
    pub fn public_key(&self) -> String {
        self.public_key.clone()
    }

    #[wasm_bindgen(getter, js_name = "contractType")]
    pub fn contract_type(&self) -> crate::core::ContractType {
        self.contract_type.into()
    }
}

#[wasm_bindgen]
pub struct AssetsList {
    #[wasm_bindgen(skip)]
    pub inner: accounts::AssetsList,
}

#[wasm_bindgen]
impl AssetsList {
    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.inner.name.clone()
    }

    #[wasm_bindgen(getter, js_name = "tonWallet")]
    pub fn ton_wallet(&self) -> TonWalletAsset {
        self.inner.ton_wallet.clone().into()
    }

    #[wasm_bindgen(getter, js_name = "tokenWallets")]
    pub fn token_wallets(&self) -> TokenWalletAssetsList {
        self.inner
            .token_wallets
            .iter()
            .cloned()
            .map(TokenWalletAsset::from)
            .map(JsValue::from)
            .collect::<js_sys::Array>()
            .unchecked_into()
    }

    #[wasm_bindgen(getter, js_name = "dePools")]
    pub fn depools(&self) -> DePoolAssetsList {
        self.inner
            .depools
            .iter()
            .cloned()
            .map(DePoolAsset::from)
            .map(JsValue::from)
            .collect::<js_sys::Array>()
            .unchecked_into()
    }
}

#[wasm_bindgen]
pub struct TonWalletAsset {
    #[wasm_bindgen(skip)]
    pub inner: accounts::TonWalletAsset,
}

#[wasm_bindgen]
impl TonWalletAsset {
    #[wasm_bindgen(getter)]
    pub fn address(&self) -> String {
        self.inner.address.to_string()
    }

    #[wasm_bindgen(getter, js_name = "publicKey")]
    pub fn public_key(&self) -> String {
        hex::encode(&self.inner.public_key.as_bytes())
    }

    #[wasm_bindgen(getter, js_name = "contractType")]
    pub fn contract_type(&self) -> crate::core::ContractType {
        self.inner.contract.into()
    }
}

impl From<accounts::TonWalletAsset> for TonWalletAsset {
    fn from(inner: accounts::TonWalletAsset) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen]
pub struct TokenWalletAsset {
    #[wasm_bindgen(skip)]
    pub inner: accounts::TokenWalletAsset,
}

#[wasm_bindgen]
impl TokenWalletAsset {
    #[wasm_bindgen(getter)]
    pub fn symbol(&self) -> crate::core::Symbol {
        self.inner.symbol.clone().into()
    }
}

impl From<accounts::TokenWalletAsset> for TokenWalletAsset {
    fn from(inner: accounts::TokenWalletAsset) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen]
pub struct DePoolAsset {
    #[wasm_bindgen(skip)]
    pub inner: accounts::DePoolAsset,
}

#[wasm_bindgen]
impl DePoolAsset {
    #[wasm_bindgen(getter)]
    pub fn address(&self) -> String {
        self.inner.address.to_string()
    }
}

impl From<accounts::DePoolAsset> for DePoolAsset {
    fn from(inner: accounts::DePoolAsset) -> Self {
        Self { inner }
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<Array<AccountsStorageEntry>>")]
    pub type PromiseStoredAccountsEntriesList;

    #[wasm_bindgen(typescript_type = "Array<TokenWalletAsset>")]
    pub type TokenWalletAssetsList;

    #[wasm_bindgen(typescript_type = "Array<DePoolAsset>")]
    pub type DePoolAssetsList;

    #[wasm_bindgen(typescript_type = "Promise<AssetsList | undefined>")]
    pub type PromiseOptionAssetsList;

    #[wasm_bindgen(typescript_type = "Promise<AccountsStorage>")]
    pub type PromiseAccountsStorage;

    #[wasm_bindgen(typescript_type = "Promise<AssetsList>")]
    pub type PromiseAssetsList;
}
