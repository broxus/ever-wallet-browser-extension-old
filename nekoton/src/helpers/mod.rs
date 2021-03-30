use std::convert::TryFrom;
use std::str::FromStr;

use ed25519_dalek::PublicKey;
use wasm_bindgen::prelude::*;

use libnekoton::contracts::wallet;
use libnekoton::helpers::address;

use crate::utils::HandleError;

#[wasm_bindgen(typescript_custom_section)]
const CONTRACT_TYPE: &'static str = r#"
type ContractType = 
    | 'SafeMultisigWallet'
    | 'SafeMultisigWallet24h'
    | 'SetcodeMultisigWallet'
    | 'SurfWallet'
    | 'WalletV3';
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "ContractType")]
    pub type ContractType;
}

impl TryFrom<ContractType> for wallet::ContractType {
    type Error = JsValue;

    fn try_from(value: ContractType) -> Result<Self, Self::Error> {
        use wallet::MultisigType;

        let contract_type = JsValue::from(value)
            .as_string()
            .ok_or_else(|| JsValue::from_str("String with contract type name expected"))?;

        Ok(match contract_type.as_ref() {
            "SafeMultisigWallet" => {
                wallet::ContractType::Multisig(MultisigType::SafeMultisigWallet)
            }
            "SafeMultisigWallet24h" => {
                wallet::ContractType::Multisig(MultisigType::SafeMultisigWallet24h)
            }
            "SetcodeMultisigWallet" => {
                wallet::ContractType::Multisig(MultisigType::SetcodeMultisigWallet)
            }
            "SurfWallet" => wallet::ContractType::Multisig(MultisigType::SurfWallet),
            "WalletV3" => wallet::ContractType::WalletV3,
            _ => return Err(JsValue::from_str("Invalid contract type")),
        })
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
    key: Pubkey,
    wallet_type: ContractType,
    workchain: i8,
) -> Result<AddressWrapper, JsValue> {
    let wallet_type = wallet::ContractType::try_from(wallet_type)?;
    Ok(AddressWrapper {
        inner: wallet::compute_address(&key.inner, wallet_type, workchain),
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
