use wasm_bindgen::prelude::*;

use nt::crypto;

use super::{JsMnemonicType, JsSignedMessage, UnsignedMessage};
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
        phrase: &str,
        mnemonic_type: JsMnemonicType,
        password: &str,
    ) -> Result<EncryptedKey, JsValue> {
        let mnemonic_type = super::parse_mnemonic_type(mnemonic_type)?;

        Ok(EncryptedKey {
            inner: crypto::EncryptedKey::new(name, password.into(), mnemonic_type, phrase.into())
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

    #[wasm_bindgen]
    pub fn sign(
        &self,
        message: &UnsignedMessage,
        password: &str,
    ) -> Result<JsSignedMessage, JsValue> {
        let signature = self
            .inner
            .sign(
                crypto::UnsignedMessage::hash(message.inner.as_ref()),
                password.into(),
            )
            .handle_error()?;
        let message = message.inner.sign(&signature).handle_error()?;
        super::make_signed_message(message)
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

    #[wasm_bindgen(getter, js_name = "mnemonicType")]
    pub fn mnemonic_type(&self) -> JsMnemonicType {
        super::make_mnemonic_type(self.inner.mnemonic_type())
    }
}
