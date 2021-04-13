use std::sync::Arc;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use nt::utils::*;

use super::{Storage, StorageImpl};
use crate::utils::*;

const STORAGE_MAIN_WALLET_STATE_CACHE: &str = "mwsc";

#[wasm_bindgen]
pub struct TonWalletStateCache {
    #[wasm_bindgen(skip)]
    pub storage: Arc<StorageImpl>,
}

impl TonWalletStateCache {
    fn make_key(address: &str) -> Result<String, JsValue> {
        let address = parse_address(address)?;
        let key = format!("{}{}", STORAGE_MAIN_WALLET_STATE_CACHE, address);
        Ok(key)
    }
}

#[wasm_bindgen]
impl TonWalletStateCache {
    #[wasm_bindgen(constructor)]
    pub fn new(storage: &Storage) -> TonWalletStateCache {
        Self {
            storage: storage.inner.clone(),
        }
    }

    #[wasm_bindgen]
    pub fn load(&self, address: &str) -> Result<PromiseOptionAccountState, JsValue> {
        use nt::external::Storage;

        let key = Self::make_key(address)?;
        let storage = self.storage.clone();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let data = match storage.get(&key).await.handle_error()? {
                Some(data) => data,
                None => return Ok(JsValue::undefined()),
            };

            let data =
                serde_json::from_str::<nt::core::models::AccountState>(&data).handle_error()?;

            Ok(JsValue::from(crate::core::models::AccountState::from(data)))
        })))
    }

    #[wasm_bindgen]
    pub fn store(
        &self,
        address: &str,
        state: &crate::core::models::AccountState,
    ) -> Result<(), JsValue> {
        use nt::external::Storage;

        let key = Self::make_key(address)?;
        let data = serde_json::to_string(&state.inner).trust_me();
        self.storage.set_unchecked(&key, &data);
        Ok(())
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<AccountState | undefined>")]
    pub type PromiseOptionAccountState;
}
