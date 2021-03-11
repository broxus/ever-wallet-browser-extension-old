use js_sys::Error;
use wasm_bindgen::prelude::*;

use nekoton_crypto::TonSigner;
pub use nekoton_crypto::{LABS_MNEMONIC, LEGACY_MNEMONIC};

use crate::utils::*;

#[wasm_bindgen]
pub struct CryptoHandler {
    #[wasm_bindgen(skip)]
    pub signer: TonSigner,
}

#[wasm_bindgen]
pub struct CreateOutput {
    #[wasm_bindgen(skip)]
    pub handler: CryptoHandler,
    #[wasm_bindgen(skip)]
    pub encrypted_data: String,
    #[wasm_bindgen(skip)]
    pub mnemonic: String,
}

#[wasm_bindgen]
impl CreateOutput {
    #[wasm_bindgen(getter)]
    pub fn handler(&self) -> *const CryptoHandler {
        &self.handler as *const _
    }
    #[wasm_bindgen(getter)]
    pub fn encrypted_data(&self) -> String {
        self.encrypted_data.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn mnemonic(&self) -> String {
        self.mnemonic.clone()
    }
}

#[wasm_bindgen]
impl CryptoHandler {
    /// Decrypts user data and returns signer
    #[wasm_bindgen]
    pub fn decrypt(password: &str, data: &str) -> Result<CryptoHandler, JsValue> {
        let data: String = data.into();
        let pass: String = password.into();
        Ok(CryptoHandler {
            signer: TonSigner::from_reader(data.as_bytes(), pass.into()).handle_error()?,
        })
    }
    /// Creates ['CryptoHandler'] from mnemonic
    /// # Arguments
    /// * `mnemonic` - 12 or 24 words, depending on mnemonic type - [`LABS_MNEMONIC`] or [`LEGACY_MNEMONIC`] set in `mnemonic_type`
    #[wasm_bindgen]
    pub fn restore_from_mnemonic(
        mnemonic: &str,
        mnemonic_type: u8,
        password: &str,
    ) -> Result<CreateOutput, JsValue> {
        let mnemonic: String = mnemonic.into();
        let data = nekoton_crypto::derive_from_words(&mnemonic, mnemonic_type)
            .map_err(|e| Error::new(&e.to_string()))?;
        let (signer, encrypted_data) = TonSigner::init(password.into(), data).handle_error()?;
        Ok(CreateOutput {
            handler: CryptoHandler { signer },
            encrypted_data,
            mnemonic,
        })
    }

    #[wasm_bindgen]
    pub fn generate(mnemonic_type: u8, password: &str) -> Result<CreateOutput, JsValue> {
        let data =
            nekoton_crypto::generate(mnemonic_type).map_err(|e| Error::new(&e.to_string()))?;
        let (signer, encrypted_data) =
            TonSigner::init(password.into(), data.keypair).handle_error()?;
        let handler = CryptoHandler { signer };
        Ok(CreateOutput {
            handler,
            encrypted_data,
            mnemonic: data.words.join(" "),
        })
    }

    #[wasm_bindgen]
    pub fn change_password(
        old_password: &str,
        new_password: &str,
        encrypted_data: &str,
    ) -> Result<String, JsValue> {
        let data = TonSigner::reencrypt(
            old_password.into(),
            new_password.into(),
            encrypted_data.into(),
        )
        .map_err(|e| Error::new(&e.to_string()))?;
        Ok(data)
    }
}
