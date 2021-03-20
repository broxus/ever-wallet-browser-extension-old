use js_sys::Error;
use wasm_bindgen::prelude::*;

use libnekoton::storage::{AccountType, StoredKey};
use libnekoton::storage::keystore::mnemonics;

use crate::utils::*;

#[wasm_bindgen]
#[derive(Clone)]
pub struct CryptoHandler {
    #[wasm_bindgen(skip)]
    pub signer: StoredKey,
}

#[wasm_bindgen]
pub struct CreateOutput {
    #[wasm_bindgen(skip)]
    pub handler: CryptoHandler,
    #[wasm_bindgen(skip)]
    pub mnemonic: String,
}

#[wasm_bindgen]
impl CreateOutput {
    #[wasm_bindgen(getter)]
    pub fn handler(&self) -> CryptoHandler {
        self.handler.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn mnemonic(&self) -> String {
        self.mnemonic.clone()
    }
}

#[wasm_bindgen]
#[derive(Copy, Clone)]
pub enum MnemonicEnum {
    Legacy = "Legacy",
    Labs = "Labs",
}

#[wasm_bindgen(constructor)]
#[derive(Copy, Clone)]
pub struct MnemonicType {
    pub mtype: MnemonicEnum,
    pub account_id: u16,
}

#[wasm_bindgen]
impl MnemonicType {
    #[wasm_bindgen(constructor)]
    pub fn new(account_id: u16, mtype: MnemonicEnum) -> MnemonicType {
        MnemonicType { mtype, account_id }
    }
}

impl From<MnemonicType> for AccountType {
    fn from(mt: MnemonicType) -> Self {
        match mt.mtype {
            MnemonicEnum::Legacy => Self::Legacy,
            MnemonicEnum::Labs => Self::Labs(mt.account_id),
            _ => unreachable!(),
        }
    }
}

#[wasm_bindgen]
impl CryptoHandler {
    #[wasm_bindgen(js_name = fromEncryptedData)]
    pub fn from_encrypted_data(data: &str) -> Result<CryptoHandler, JsValue> {
        let data: String = data.into();
        Ok(CryptoHandler {
            signer: StoredKey::from_reader(data.as_bytes()).handle_error()?,
        })
    }
    /// Creates ['CryptoHandler'] from mnemonic
    /// # Arguments
    /// * `mnemonic` - 12 or 24 words, depending on mnemonic type - [`LABS_MNEMONIC`] or [`LEGACY_MNEMONIC`] set in `mnemonic_type`
    #[wasm_bindgen(js_name = restoreFromMnemonic)]
    pub fn restore_from_mnemonic(
        mnemonic: &str,
        mnemonic_type: MnemonicType,
        password: &str,
    ) -> Result<CryptoHandler, JsValue> {
        let signer = StoredKey::new(password.into(),  mnemonic_type.into(), &mnemonic)
            .handle_error()?;
        Ok(CryptoHandler { signer })
    }

    #[wasm_bindgen(js_name = asJson)]
    pub fn as_json(&self) -> String {
        self.signer.as_json()
    }

    #[wasm_bindgen]
    pub fn generate(mnemonic_type: MnemonicType, password: &str) -> Result<CreateOutput, JsValue> {
        let data = mnemonics::generate(mnemonic_type.into())
            .map_err(|e| Error::new(&e.to_string()))?;
        let signer = StoredKey::new(
            password.into(),
            mnemonic_type.into(),
            &data.words.join(" "),
        )
            .handle_error()?;
        let handler = CryptoHandler { signer };
        Ok(CreateOutput {
            handler,
            mnemonic: data.words.join(" "),
        })
    }

    #[wasm_bindgen(js_name = changePassword)]
    pub fn change_password(
        &mut self,
        old_password: &str,
        new_password: &str,
    ) -> Result<(), JsValue> {
        self.signer.change_password(
            old_password.into(),
            new_password.into(),
        )
        .map_err(|e| Error::new(&e.to_string()))?;
        Ok(())
    }
}
