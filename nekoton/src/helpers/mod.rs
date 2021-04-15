use std::convert::TryFrom;
use std::str::FromStr;

use ton_block::MsgAddressInt;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use crate::utils::*;

#[wasm_bindgen(js_name = "computeTonWalletAddress")]
pub fn compute_ton_wallet_address(
    public_key: &str,
    wallet_type: crate::core::ton_wallet::ContractType,
    workchain: i8,
) -> Result<String, JsValue> {
    use nt::core::ton_wallet;

    let public_key = ed25519_dalek::PublicKey::from_bytes(&hex::decode(public_key).handle_error()?)
        .handle_error()?;
    let wallet_type = ton_wallet::ContractType::try_from(wallet_type)?;

    let address = ton_wallet::compute_address(&public_key, wallet_type, workchain);

    Ok(address.to_string())
}

#[wasm_bindgen(js_name = "packAddress")]
pub fn pack_address(address: &str, is_url_safe: bool, bounceable: bool) -> Result<String, JsValue> {
    let address = match MsgAddressInt::from_str(address) {
        Ok(address) => address,
        Err(e) => match nt::helpers::address::unpack_std_smc_addr(address, is_url_safe) {
            Ok(address) => address,
            Err(_) => return Err(e).handle_error(),
        },
    };

    nt::helpers::address::pack_std_smc_addr(is_url_safe, &address, bounceable).handle_error()
}

#[wasm_bindgen(js_name = "unpackAddress")]
pub fn unpack_address(address: &str, is_url_safe: bool) -> Result<String, JsValue> {
    let address = match nt::helpers::address::unpack_std_smc_addr(address, is_url_safe) {
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
    nt::helpers::address::validate_address(address)
}

#[wasm_bindgen(js_name = "getBip39Hints")]
pub fn get_hints(word: &str) -> StringArray {
    nt::crypto::dict::get_hints(word)
        .into_iter()
        .map(JsValue::from)
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
