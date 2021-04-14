mod encrypted_key;

use wasm_bindgen::prelude::*;

use nt::crypto;

use crate::utils::*;
use wasm_bindgen::JsCast;

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
pub fn generate_mnemonic(mnemonic_type: MnemonicType) -> Result<GeneratedMnemonic, JsValue> {
    let key = crypto::generate_key(mnemonic_type.into()).handle_error()?;
    Ok(make_generated_mnemonic(key.words.join(" "), mnemonic_type))
}

#[wasm_bindgen(typescript_custom_section)]
const GENERATED_MNEMONIC: &str = r#"
export type GeneratedMnemonic = {
    phrase: string,
    mnemonicType: MnemonicType,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "GeneratedMnemonic")]
    pub type GeneratedMnemonic;
}

fn make_generated_mnemonic(phrase: String, mnemonic_type: MnemonicType) -> GeneratedMnemonic {
    ObjectBuilder::new()
        .set("phrase", phrase)
        .set("mnemonicType", mnemonic_type)
        .build()
        .unchecked_into()
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
