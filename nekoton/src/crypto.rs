use js_sys::Error;
use wasm_bindgen::prelude::*;

use nekoton_crypto::{AccountType, TonSigner};
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
    pub mnemonic: String,
}

#[wasm_bindgen]
impl CreateOutput {
    #[wasm_bindgen(getter)]
    pub fn handler(&self) -> *const CryptoHandler {
        &self.handler as *const _
    }

    #[wasm_bindgen(getter)]
    pub fn mnemonic(&self) -> String {
        self.mnemonic.clone()
    }
}

#[wasm_bindgen(constructor)]
#[derive(Copy, Clone)]
pub enum MnemonicEnum {
    Legacy = "Legacy",
    Labs = "Labs",
}

#[wasm_bindgen(constructor)]
#[derive(Copy, Clone)]
pub struct MnemonicType {
    pub mtype: MnemonicEnum,
    pub id: u16,
}

#[wasm_bindgen]
impl MnemonicType {
    #[wasm_bindgen(constructor)]
    pub fn new(id: u16, mtype: MnemonicEnum) -> MnemonicType {
        MnemonicType { mtype, id }
    }
}

impl From<MnemonicType> for AccountType {
    fn from(mt: MnemonicType) -> Self {
        match mt.mtype {
            MnemonicEnum::Legacy => Self::Legacy,
            MnemonicEnum::Labs => match mt.id {
                0 => Self::LabsDefault,
                a => Self::LabsDerived(a),
            },
            _ => unreachable!(),
        }
    }
}

#[wasm_bindgen]
impl CryptoHandler {
    #[wasm_bindgen]
    pub fn from_encrypted_data(data: &str) -> Result<CryptoHandler, JsValue> {
        let data: String = data.into();
        Ok(CryptoHandler {
            signer: TonSigner::from_reader(data.as_bytes()).handle_error()?,
        })
    }
    /// Creates ['CryptoHandler'] from mnemonic
    /// # Arguments
    /// * `mnemonic` - 12 or 24 words, depending on mnemonic type - [`LABS_MNEMONIC`] or [`LEGACY_MNEMONIC`] set in `mnemonic_type`
    #[wasm_bindgen]
    pub fn restore_from_mnemonic(
        mnemonic: &str,
        mnemonic_type: MnemonicType,
        password: &str,
    ) -> Result<CryptoHandler, JsValue> {
        let mnemonic: String = mnemonic.into();
        let data = nekoton_crypto::derive_from_words(&mnemonic, mnemonic_type.into())
            .map_err(|e| Error::new(&e.to_string()))?;
        let signer = TonSigner::init(password.into(), data, mnemonic_type.into(), &mnemonic)
            .handle_error()?;
        Ok(CryptoHandler { signer })
    }

    #[wasm_bindgen]
    pub fn generate(mnemonic_type: MnemonicType, password: &str) -> Result<CreateOutput, JsValue> {
        let data = nekoton_crypto::generate(mnemonic_type.into())
            .map_err(|e| Error::new(&e.to_string()))?;
        let signer = TonSigner::init(
            password.into(),
            data.keypair,
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

    #[wasm_bindgen]
    pub fn change_password(
        old_password: &str,
        new_password: &str,
        encrypted_data: &str,
    ) -> Result<String, JsValue> {
        let data = TonSigner::change_password(
            old_password.into(),
            new_password.into(),
            encrypted_data.into(),
        )
        .map_err(|e| Error::new(&e.to_string()))?;
        Ok(data)
    }
}
