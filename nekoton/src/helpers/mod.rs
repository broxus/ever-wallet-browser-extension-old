use ed25519_dalek::PublicKey;
use wasm_bindgen::prelude::*;

use libnekoton::helpers::address;

use crate::utils::HandleError;

#[wasm_bindgen]
pub enum ContractType {
    SafeMultisigWallet = "SafeMultisigWallet",
    SafeMultisigWallet24h = "SafeMultisigWallet24h",
    SetcodeMultisigWallet = "SetcodeMultisigWallet",
    SurfWallet = "SurfWallet",
    WalletV3 = "WalletV3",
}

impl From<ContractType> for address::ContractType {
    fn from(w: ContractType) -> Self {
        match w {
            ContractType::SafeMultisigWallet => address::ContractType::SafeMultisigWallet,
            ContractType::SafeMultisigWallet24h => address::ContractType::SafeMultisigWallet24h,
            ContractType::SetcodeMultisigWallet => address::ContractType::SetcodeMultisigWallet,
            ContractType::SurfWallet => address::ContractType::SurfWallet,
            ContractType::WalletV3 => address::ContractType::WalletV3,
            _ => unreachable!(),
        }
    }
}

#[wasm_bindgen]
pub struct Pubkey {
    #[wasm_bindgen(skip)]
    pub inner: ed25519_dalek::PublicKey,
}

#[wasm_bindgen]
impl Pubkey {
    /// hex str
    #[wasm_bindgen(constructor)]
    pub fn new(key: &str) -> Result<Pubkey, JsValue> {
        Ok(Pubkey {
            inner: PublicKey::from_bytes(&*hex::decode(&key).handle_error()?).handle_error()?,
        })
    }
}

#[wasm_bindgen]
pub struct AddressWrapper {
    #[wasm_bindgen(skip)]
    pub inner: ton_block::MsgAddrStd,
}

#[wasm_bindgen]
impl AddressWrapper {
    #[wasm_bindgen(constructor)]
    pub fn new(addr: &str) -> Result<AddressWrapper, JsValue> {
        Ok(AddressWrapper {
            inner: address::msg_addr_from_str(addr).handle_error()?,
        })
    }

    #[wasm_bindgen]
    pub fn to_string(&self) -> String {
        self.inner.to_string()
    }
}

#[wasm_bindgen(js_name = "computeAddressFromPubkey")]
pub fn compute_address_from_key(
    key: Pubkey,
    wallet_type: ContractType,
    workchain: i8,
) -> AddressWrapper {
    let ad = address::compute_address(&key.inner, wallet_type.into(), workchain);
    AddressWrapper { inner: ad }
}

#[wasm_bindgen(js_name = "packAddress")]
pub fn pack_address(addr: AddressWrapper, is_url_safe: bool, bouncable: bool) -> String {
    address::pack_std_smc_addr(is_url_safe, &addr.inner, bouncable)
}

#[wasm_bindgen(js_name = "unpackAddress")]
pub fn unpack_address(packed_address: &str, is_url_safe: bool) -> Result<AddressWrapper, JsValue> {
    address::unpack_std_smc_addr(packed_address, is_url_safe)
        .map(|x| AddressWrapper { inner: x })
        .handle_error()
}
