use std::convert::TryFrom;
use std::str::FromStr;

use wasm_bindgen::prelude::*;

use libnekoton::core::ton_wallet;
use libnekoton::helpers::address;

use crate::utils::HandleError;

#[wasm_bindgen]
pub struct AddressWrapper {
    #[wasm_bindgen(skip)]
    pub inner: ton_block::MsgAddressInt,
}

#[wasm_bindgen]
impl AddressWrapper {
    #[wasm_bindgen(constructor)]
    pub fn new(addr: &str) -> Result<AddressWrapper, JsValue> {
        let inner = ton_block::MsgAddressInt::from_str(addr).handle_error()?;
        Ok(AddressWrapper { inner })
    }

    #[wasm_bindgen]
    pub fn to_string(&self) -> String {
        self.inner.to_string()
    }
}

#[wasm_bindgen(js_name = "computeTonWalletAddress")]
pub fn compute_ton_wallet_address(
    public_key: &str,
    wallet_type: crate::core::ContractType,
    workchain: i8,
) -> Result<AddressWrapper, JsValue> {
    let public_key = ed25519_dalek::PublicKey::from_bytes(&hex::decode(public_key).handle_error()?)
        .handle_error()?;

    let wallet_type = ton_wallet::ContractType::try_from(wallet_type)?;
    Ok(AddressWrapper {
        inner: ton_wallet::compute_address(&public_key, wallet_type, workchain),
    })
}

#[wasm_bindgen(js_name = "packAddress")]
pub fn pack_address(
    addr: AddressWrapper,
    is_url_safe: bool,
    bounceable: bool,
) -> Result<String, JsValue> {
    address::pack_std_smc_addr(is_url_safe, &addr.inner, bounceable).handle_error()
}

#[wasm_bindgen(js_name = "unpackAddress")]
pub fn unpack_address(packed_address: &str, is_url_safe: bool) -> Result<AddressWrapper, JsValue> {
    address::unpack_std_smc_addr(packed_address, is_url_safe)
        .map(|inner| AddressWrapper { inner })
        .handle_error()
}

#[wasm_bindgen(js_name = "checkAddress")]
pub fn check_address(address: &str) -> bool {
    address::validate_address(address)
}
