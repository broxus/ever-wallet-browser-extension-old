use std::convert::TryFrom;
use std::str::FromStr;

use ton_block::{Deserializable, MsgAddressInt, Serializable};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use crate::utils::*;

pub mod abi;

#[wasm_bindgen(js_name = "base64ToUtf8Lossy")]
pub fn base64_to_utf8_lossy(data: &str) -> Result<String, JsValue> {
    let data = base64::decode(data).handle_error()?;
    Ok(String::from_utf8_lossy(&data).to_string())
}

#[wasm_bindgen(js_name = "extractAddressWorkchain")]
pub fn extract_address_workchain(address: &str) -> Result<i8, JsValue> {
    let address = match MsgAddressInt::from_str(address) {
        Ok(address) => address,
        Err(e) => match nt_utils::unpack_std_smc_addr(address, false) {
            Ok(address) => address,
            Err(_) => match nt_utils::unpack_std_smc_addr(address, true) {
                Ok(address) => address,
                Err(_) => return Err(e).handle_error(),
            },
        },
    };
    Ok(address.workchain_id() as i8)
}

#[wasm_bindgen(js_name = "computeTonWalletAddress")]
pub fn compute_ton_wallet_address(
    public_key: &str,
    wallet_type: crate::core::ton_wallet::ContractType,
    workchain: i8,
) -> Result<String, JsValue> {
    use nt::core::ton_wallet;

    let public_key = ed25519_dalek::PublicKey::from_bytes(&hex::decode(public_key).handle_error()?)
        .handle_error()?;
    let wallet_type = ton_wallet::WalletType::try_from(wallet_type)?;

    let address = ton_wallet::compute_address(&public_key, wallet_type, workchain);

    Ok(address.to_string())
}

#[wasm_bindgen(js_name = "packAddress")]
pub fn pack_address(address: &str, is_url_safe: bool, bounceable: bool) -> Result<String, JsValue> {
    let address = match MsgAddressInt::from_str(address) {
        Ok(address) => address,
        Err(e) => match nt_utils::unpack_std_smc_addr(address, is_url_safe) {
            Ok(address) => address,
            Err(_) => return Err(e).handle_error(),
        },
    };

    nt_utils::pack_std_smc_addr(is_url_safe, &address, bounceable).handle_error()
}

#[wasm_bindgen(js_name = "unpackAddress")]
pub fn unpack_address(address: &str, is_url_safe: bool) -> Result<String, JsValue> {
    let address = match nt_utils::unpack_std_smc_addr(address, is_url_safe) {
        Ok(address) => address,
        Err(e) => match MsgAddressInt::from_str(address) {
            Ok(address) => address,
            Err(_) => return Err(e).handle_error(),
        },
    };

    Ok(address.to_string())
}

#[wasm_bindgen(js_name = "checkAddress")]
pub fn check_address(address: &str) -> bool {
    nt_utils::validate_address(address)
}

#[wasm_bindgen(js_name = "repackAddress")]
pub fn repack_address(address: &str) -> Result<String, JsValue> {
    nt_utils::repack_address(address)
        .map(|x| x.to_string())
        .handle_error()
}

#[wasm_bindgen(js_name = "checkEthAddress")]
pub fn check_eth_address(address: &str) -> bool {
    match address.strip_prefix("0x") {
        Some(address) => hex::decode(address)
            .ok()
            .and_then(|bytes| (bytes.len() == 20).then(|| ()))
            .is_some(),
        None => false,
    }
}

#[wasm_bindgen(js_name = "getBip39Hints")]
pub fn get_hints(word: &str) -> StringArray {
    nt::crypto::dict::get_hints(word)
        .into_iter()
        .map(|word| JsValue::from_str(word))
        .collect::<js_sys::Array>()
        .unchecked_into()
}

#[wasm_bindgen(js_name = "validateMnemonic")]
pub fn validate_mnemonic(
    phrase: &str,
    mnemonic_type: crate::crypto::JsMnemonicType,
) -> Result<(), JsValue> {
    let mnemonic_type = crate::crypto::parse_mnemonic_type(mnemonic_type)?;
    nt::crypto::derive_from_phrase(phrase, mnemonic_type)
        .handle_error()
        .map(|_| ())
}

#[wasm_bindgen(js_name = "encodeComment")]
pub fn encode_comment(comment: &str) -> Result<String, JsValue> {
    let body = base64::decode(comment.trim())
        .ok()
        .and_then(|bytes| ton_types::deserialize_tree_of_cells(&mut bytes.as_slice()).ok())
        .map(Result::<_, JsValue>::Ok)
        .unwrap_or_else(|| {
            nt_abi::create_comment_payload(comment)
                .handle_error()
                .map(|slice| slice.into_cell())
        })?;

    Ok(base64::encode(
        ton_types::serialize_toc(&body).handle_error()?,
    ))
}

#[wasm_bindgen(js_name = "extractPublicKey")]
pub fn extract_public_key(boc: &str) -> Result<String, JsValue> {
    crate::utils::parse_account_stuff(boc)
        .and_then(|x| nt_abi::extract_public_key(&x).handle_error())
        .map(hex::encode)
}

#[wasm_bindgen(js_name = "codeToTvc")]
pub fn code_to_tvc(code: &str) -> Result<String, JsValue> {
    let cell = parse_cell(code)?;
    nt_abi::code_to_tvc(cell)
        .and_then(|x| x.serialize())
        .and_then(|x| ton_types::serialize_toc(&x))
        .map(base64::encode)
        .handle_error()
}

#[wasm_bindgen(js_name = "mergeTvc")]
pub fn merge_tvc(code: &str, data: &str) -> Result<String, JsValue> {
    let state_init = ton_block::StateInit {
        code: Some(parse_cell(code)?),
        data: Some(parse_cell(data)?),
        ..Default::default()
    };

    let cell = state_init.serialize().handle_error()?;
    let bytes = ton_types::serialize_toc(&cell).handle_error()?;
    Ok(base64::encode(&bytes))
}

#[wasm_bindgen(typescript_custom_section)]
const STATE_INIT: &str = r#"
export type StateInit = {
    data: string | undefined;
    code: string | undefined;
};
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "StateInit")]
    pub type StateInit;
}

#[wasm_bindgen(js_name = "splitTvc")]
pub fn split_tvc(tvc: &str) -> Result<StateInit, JsValue> {
    let state_init = ton_block::StateInit::construct_from_base64(tvc).handle_error()?;

    let data = match state_init.data {
        Some(data) => {
            let data = ton_types::serialize_toc(&data).handle_error()?;
            Some(base64::encode(data))
        }
        None => None,
    };

    let code = match state_init.code {
        Some(code) => {
            let code = ton_types::serialize_toc(&code).handle_error()?;
            Some(base64::encode(code))
        }
        None => None,
    };

    Ok(ObjectBuilder::new()
        .set("data", data)
        .set("code", code)
        .build()
        .unchecked_into())
}

#[wasm_bindgen(js_name = "setCodeSalt")]
pub fn set_code_salt(code: &str, salt: &str) -> Result<String, JsValue> {
    nt_abi::set_code_salt(parse_cell(code)?, parse_cell(salt)?)
        .and_then(|cell| ton_types::serialize_toc(&cell))
        .map(base64::encode)
        .handle_error()
}
