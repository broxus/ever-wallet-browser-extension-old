use ed25519_dalek::PublicKey;
use libnekoton::helpers::address::{
    compute_address, msg_addr_from_str, pack_std_smc_addr, unpack_std_smc_addr,
};
use libnekoton::helpers::address::Wallet;
use wasm_bindgen::prelude::*;

use crate::utils::*;

#[wasm_bindgen]
pub enum WalletType {
    SafeMultisigWallet = "SafeMultisigWallet",
    SafeMultisigWallet24h = "SafeMultisigWallet24h",
    SetcodeMultisigWallet = "SetcodeMultisigWallet",
    SurfWallet = "SurfWallet",
    WalletV3 = "WalletV3",
}

impl From<WalletType> for Wallet {
    fn from(w: WalletType) -> Self {
        match w {
            WalletType::SafeMultisigWallet => Wallet::SafeMultisigWallet,
            WalletType::SafeMultisigWallet24h => Wallet::SafeMultisigWallet24h,
            WalletType::SetcodeMultisigWallet => Wallet::SetcodeMultisigWallet,
            WalletType::SurfWallet => Wallet::SurfWallet,
            WalletType::WalletV3 => Wallet::WalletV3,
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
            inner: msg_addr_from_str(addr).handle_error()?,
        })
    }

    #[wasm_bindgen]
    pub fn to_string(&self)->String{
        self.inner.to_string()
    }
}


#[wasm_bindgen(js_name = computeAddressFromPubkey)]
pub fn compute_address_from_key(
    key: Pubkey,
    wallet_type: WalletType,
    workchain: i8,
) -> AddressWrapper {
    let ad = compute_address(&key.inner, wallet_type.into(), workchain);
    AddressWrapper { inner: ad }
}

#[wasm_bindgen(js_name = packAddress)]
pub fn pack_address(addr: AddressWrapper,is_url_safe: bool, bouncable: bool) -> String {
    pack_std_smc_addr(is_url_safe, &addr.inner, bouncable)
}
#[wasm_bindgen(js_name = unpackAddress)]
pub fn unpack_address(packed_address: &str, is_url_safe: bool) -> Result<AddressWrapper, JsValue> {
    unpack_std_smc_addr(packed_address, is_url_safe).map(|x| AddressWrapper { inner: x }).handle_error()
}
