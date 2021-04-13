use wasm_bindgen::prelude::*;

use nt::crypto;

use super::MnemonicType;
use crate::utils::*;

#[wasm_bindgen]
#[derive(Clone)]
pub struct EncryptedKey {
    #[wasm_bindgen(skip)]
    pub inner: crypto::EncryptedKey,
}

#[wasm_bindgen]
impl EncryptedKey {
    #[wasm_bindgen(constructor)]
    pub fn new(
        name: &str,
        mnemonic: &str,
        account_type: MnemonicType,
        password: &str,
    ) -> Result<EncryptedKey, JsValue> {
        Ok(EncryptedKey {
            inner: crypto::EncryptedKey::new(name, password.into(), account_type.into(), &mnemonic)
                .handle_error()?,
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
    pub fn from_json(data: &str) -> Result<EncryptedKey, JsValue> {
        Ok(EncryptedKey {
            inner: crypto::EncryptedKey::from_reader(data.as_bytes()).handle_error()?,
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

    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.inner.name().to_owned()
    }

    #[wasm_bindgen(getter, js_name = "accountType")]
    pub fn account_type(&self) -> MnemonicType {
        MnemonicType {
            inner: self.inner.account_type().clone(),
        }
    }
}
