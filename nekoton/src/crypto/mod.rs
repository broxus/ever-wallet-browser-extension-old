use js_sys::Error;
use wasm_bindgen::prelude::*;

use libnekoton::storage;
use libnekoton::storage::keystore::mnemonics;

use crate::utils::*;

#[wasm_bindgen]
#[derive(Clone)]
pub struct StoredKey {
    #[wasm_bindgen(skip)]
    pub inner: storage::StoredKey,
}

#[wasm_bindgen]
impl StoredKey {
    /// Creates ['CryptoHandler'] from mnemonic
    /// # Arguments
    /// * `mnemonic` - 12 or 24 words, depending on mnemonic type - [`LABS_MNEMONIC`] or [`LEGACY_MNEMONIC`] set in `mnemonic_type`
    #[wasm_bindgen(constructor)]
    pub fn new(
        mnemonic: &str,
        account_type: AccountType,
        password: &str,
    ) -> Result<StoredKey, JsValue> {
        Ok(StoredKey {
            inner: storage::StoredKey::new(password.into(), account_type.into(), &mnemonic)
                .handle_error()?,
        })
    }

    #[wasm_bindgen(js_name = "generateMnemonic")]
    pub fn generate_mnemonic(account_type: AccountType) -> Result<GeneratedMnemonic, JsValue> {
        let key = mnemonics::generate(account_type.into()).handle_error()?;
        Ok(GeneratedMnemonic {
            phrase: key.words.join(" "),
            account_type: account_type.inner,
        })
    }

    #[wasm_bindgen(js_name = "changePassword")]
    pub fn change_password(
        &mut self,
        old_password: &str,
        new_password: &str,
    ) -> Result<(), JsValue> {
        self.inner
            .change_password(old_password.into(), new_password.into())
            .handle_error()?;
        Ok(())
    }

    #[wasm_bindgen(js_name = "fromJSON")]
    pub fn from_json(data: &str) -> Result<StoredKey, JsValue> {
        Ok(StoredKey {
            inner: storage::StoredKey::from_reader(data.as_bytes()).handle_error()?,
        })
    }

    #[wasm_bindgen(js_name = "toJSON")]
    pub fn to_json(&self) -> String {
        self.inner.as_json()
    }

    #[wasm_bindgen(getter, js_name = "publicKey")]
    pub fn public_key(&self) -> String {
        hex::encode(self.inner.public_key())
    }
}

#[wasm_bindgen]
pub struct GeneratedMnemonic {
    #[wasm_bindgen(skip)]
    pub phrase: String,
    #[wasm_bindgen(skip)]
    pub account_type: storage::AccountType,
}

#[wasm_bindgen]
impl GeneratedMnemonic {
    #[wasm_bindgen(js_name = "createKey")]
    pub fn create_key(self, password: &str) -> Result<StoredKey, JsValue> {
        Ok(StoredKey {
            inner: storage::StoredKey::new(password.into(), self.account_type, &self.phrase)
                .handle_error()?,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn phrase(&self) -> String {
        self.phrase.clone()
    }

    #[wasm_bindgen(getter, js_name = "accountType")]
    pub fn account_type(&self) -> AccountType {
        AccountType {
            inner: self.account_type,
        }
    }
}

#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct AccountType {
    #[wasm_bindgen(skip)]
    pub inner: storage::AccountType,
}

#[wasm_bindgen]
impl AccountType {
    #[wasm_bindgen(js_name = "makeLabs")]
    pub fn make_labs(id: u16) -> AccountType {
        AccountType {
            inner: storage::AccountType::Labs(id),
        }
    }

    #[wasm_bindgen(js_name = "makeLegacy")]
    pub fn make_legacy() -> AccountType {
        AccountType {
            inner: storage::AccountType::Legacy,
        }
    }

    #[wasm_bindgen(getter, js_name = "wordCount")]
    pub fn word_count(&self) -> u32 {
        match self.inner {
            storage::AccountType::Labs(_) => 12,
            storage::AccountType::Legacy => 24,
        }
    }

    #[wasm_bindgen(getter, js_name = "accountId")]
    pub fn account_id(&self) -> u16 {
        match self.inner {
            storage::AccountType::Labs(id) => id,
            _ => 0,
        }
    }
}

impl From<AccountType> for storage::AccountType {
    fn from(t: AccountType) -> Self {
        t.inner
    }
}
