mod encrypted_key;

use wasm_bindgen::prelude::*;

use nt::crypto;

use crate::utils::*;

#[wasm_bindgen]
pub struct UnsignedMessage {
    #[wasm_bindgen(skip)]
    pub inner: Box<dyn crypto::UnsignedMessage>,
}

#[wasm_bindgen]
impl UnsignedMessage {
    #[wasm_bindgen(js_name = "refreshTimeout")]
    pub fn refresh_timeout(&mut self) {
        self.inner.refresh_timeout();
    }

    #[wasm_bindgen(js_name = "expireAt")]
    pub fn expire_at(&self) -> u32 {
        self.inner.expire_at()
    }

    #[wasm_bindgen(getter)]
    pub fn hash(&self) -> String {
        hex::encode(crypto::UnsignedMessage::hash(self.inner.as_ref()))
    }

    #[wasm_bindgen(js_name = "signFake")]
    pub fn sign_fake(&self) -> Result<SignedMessage, JsValue> {
        let inner = self.inner.sign(&[0; 64]).handle_error()?;
        Ok(SignedMessage { inner })
    }

    #[wasm_bindgen]
    pub fn sign(
        &self,
        key: &encrypted_key::EncryptedKey,
        password: &str,
    ) -> Result<SignedMessage, JsValue> {
        let signature = key
            .inner
            .sign(
                crypto::UnsignedMessage::hash(self.inner.as_ref()),
                password.into(),
            )
            .handle_error()?;
        let inner = self.inner.sign(&signature).handle_error()?;
        Ok(SignedMessage { inner })
    }
}

#[wasm_bindgen]
pub struct SignedMessage {
    #[wasm_bindgen(skip)]
    pub inner: crypto::SignedMessage,
}

#[wasm_bindgen]
impl SignedMessage {
    #[wasm_bindgen(getter, js_name = "expireAt")]
    pub fn expire_at(&self) -> u32 {
        self.inner.expire_at
    }
}

#[wasm_bindgen(js_name = "generateMnemonic")]
pub fn generate_mnemonic(account_type: MnemonicType) -> Result<GeneratedMnemonic, JsValue> {
    let key = crypto::generate_key(account_type.into()).handle_error()?;
    Ok(GeneratedMnemonic {
        phrase: key.words.join(" "),
        mnemonic_type: account_type.inner,
    })
}

#[wasm_bindgen]
pub struct GeneratedMnemonic {
    #[wasm_bindgen(skip)]
    pub phrase: String,
    #[wasm_bindgen(skip)]
    pub mnemonic_type: crypto::MnemonicType,
}

#[wasm_bindgen]
impl GeneratedMnemonic {
    #[wasm_bindgen(getter)]
    pub fn phrase(&self) -> String {
        self.phrase.clone()
    }

    #[wasm_bindgen(getter, js_name = "mnemonicType")]
    pub fn mnemonic_type(&self) -> MnemonicType {
        MnemonicType::new(self.mnemonic_type)
    }
}

#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct MnemonicType {
    #[wasm_bindgen(skip)]
    pub inner: crypto::MnemonicType,
}

impl MnemonicType {
    pub fn new(account_type: crypto::MnemonicType) -> Self {
        Self {
            inner: account_type,
        }
    }
}

#[wasm_bindgen]
impl MnemonicType {
    #[wasm_bindgen(js_name = "makeLabs")]
    pub fn make_labs(id: u16) -> MnemonicType {
        MnemonicType::new(crypto::MnemonicType::Labs(id))
    }

    #[wasm_bindgen(js_name = "makeLegacy")]
    pub fn make_legacy() -> MnemonicType {
        MnemonicType::new(crypto::MnemonicType::Legacy)
    }

    #[wasm_bindgen(getter, js_name = "wordCount")]
    pub fn word_count(&self) -> u32 {
        match self.inner {
            crypto::MnemonicType::Labs(_) => 12,
            crypto::MnemonicType::Legacy => 24,
        }
    }

    #[wasm_bindgen(getter, js_name = "accountId")]
    pub fn account_id(&self) -> u16 {
        match self.inner {
            crypto::MnemonicType::Labs(id) => id,
            _ => 0,
        }
    }
}

impl From<MnemonicType> for crypto::MnemonicType {
    fn from(t: MnemonicType) -> Self {
        t.inner
    }
}
