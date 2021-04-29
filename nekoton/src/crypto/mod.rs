mod encrypted_key;

use serde::Deserialize;
use ton_block::Serializable;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

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
    pub fn sign_fake(&self) -> Result<JsSignedMessage, JsValue> {
        self.inner
            .sign(&[0; 64])
            .handle_error()
            .and_then(make_signed_message)
    }
}

#[wasm_bindgen(typescript_custom_section)]
const SIGNED_MESSAGE: &str = r#"
export type SignedMessage = {
    bodyHash: string,
    expireAt: number,
    boc: string,
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "SignedMessage")]
    pub type JsSignedMessage;
}

pub fn make_signed_message(data: nt::crypto::SignedMessage) -> Result<JsSignedMessage, JsValue> {
    let boc = {
        let cell = data.message.write_to_new_cell().handle_error()?.into();
        base64::encode(ton_types::serialize_toc(&cell).handle_error()?)
    };

    Ok(ObjectBuilder::new()
        .set(
            "bodyHash",
            data.message
                .body()
                .map(|body| body.into_cell().repr_hash())
                .unwrap_or_default()
                .to_hex_string(),
        )
        .set("expireAt", data.expire_at)
        .set("boc", boc)
        .build()
        .unchecked_into())
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedSignedMessage {
    pub expire_at: u32,
    #[serde(deserialize_with = "deserialize_message")]
    pub boc: ton_block::Message,
}

pub fn parse_signed_message(data: JsSignedMessage) -> Result<ParsedSignedMessage, JsValue> {
    JsValue::into_serde::<ParsedSignedMessage>(&data).handle_error()
}

#[wasm_bindgen(js_name = "generateMnemonic")]
pub fn generate_mnemonic(mnemonic_type: JsMnemonicType) -> Result<GeneratedMnemonic, JsValue> {
    let mnemonic_type = parse_mnemonic_type(mnemonic_type)?;

    let key = crypto::generate_key(mnemonic_type).handle_error()?;
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

fn make_generated_mnemonic(
    phrase: String,
    mnemonic_type: nt::crypto::MnemonicType,
) -> GeneratedMnemonic {
    ObjectBuilder::new()
        .set("phrase", phrase)
        .set("mnemonicType", make_mnemonic_type(mnemonic_type))
        .build()
        .unchecked_into()
}

#[wasm_bindgen(js_name = "makeLabsMnemonic")]
pub fn make_labs_mnemonic(id: u16) -> JsMnemonicType {
    make_mnemonic_type(crypto::MnemonicType::Labs(id))
}

#[wasm_bindgen(js_name = "makeLegacyMnemonic")]
pub fn make_legacy_mnemonic() -> JsMnemonicType {
    make_mnemonic_type(crypto::MnemonicType::Legacy)
}

#[wasm_bindgen(typescript_custom_section)]
const MNEMONIC_TYPE: &str = r#"
export type MnemonicType = 
    | { type: 'labs', accountId: number } 
    | { type: 'legacy' };
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "MnemonicType")]
    pub type JsMnemonicType;
}

#[derive(Copy, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ParsedMnemonicType {
    #[serde(rename_all = "camelCase")]
    Labs {
        account_id: u16,
    },
    Legacy,
}

impl From<ParsedMnemonicType> for nt::crypto::MnemonicType {
    fn from(data: ParsedMnemonicType) -> Self {
        match data {
            ParsedMnemonicType::Labs { account_id } => nt::crypto::MnemonicType::Labs(account_id),
            ParsedMnemonicType::Legacy => nt::crypto::MnemonicType::Legacy,
        }
    }
}

pub fn make_mnemonic_type(data: nt::crypto::MnemonicType) -> JsMnemonicType {
    match data {
        nt::crypto::MnemonicType::Labs(account_id) => ObjectBuilder::new()
            .set("type", "labs")
            .set("accountId", account_id)
            .build(),
        nt::crypto::MnemonicType::Legacy => ObjectBuilder::new().set("type", "legacy").build(),
    }
    .unchecked_into()
}

pub fn parse_mnemonic_type(data: JsMnemonicType) -> Result<nt::crypto::MnemonicType, JsValue> {
    JsValue::into_serde::<ParsedMnemonicType>(&data)
        .handle_error()
        .map(From::from)
}

fn deserialize_message<'de, D>(deserializer: D) -> Result<ton_block::Message, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::Error;
    use ton_block::Deserializable;

    let data = String::deserialize(deserializer)?;
    ton_block::Message::construct_from_base64(&data).map_err(D::Error::custom)
}
