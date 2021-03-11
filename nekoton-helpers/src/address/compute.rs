use ton_block::MsgAddrStd;
use ton_sdk::ContractImage;

const SAFE_MULTISIG_WALLET: &[u8] = include_bytes!("../contracts/SafeMultisigWallet.tvc");
const SAFE_MULTISIG_WALLET24H: &[u8] = include_bytes!("../contracts/SafeMultisigWallet24h.tvc");
const SETCODE_MULTISIG_WALLET: &[u8] = include_bytes!("../contracts/SetcodeMultisigWallet.tvc");
const SURF: &[u8] = include_bytes!("../contracts/Surf.tvc");

fn compute(pk: &ed25519_dalek::PublicKey) -> MsgAddrStd {}
