// use ed25519_dalek::PublicKey;
// use nekoton_helpers::address::{
//     compute_address, msg_addr_from_str, pack_std_smc_addr, unpack_std_smc_addr,
// };
// use wasm_bindgen::prelude::*;
//
// #[wasm_bindgen]
// struct Pubkey {
//     #[wasm_bindgen(skip)]
//     inner: ed25519_dalek::PublicKey,
// }
//
// impl Pubkey {
//     /// hex str
//     fn new(key: &str) -> Pubkey {
//         Pubkey {
//             inner: PublicKey::from_bytes(hex::decode(&key)),
//         }
//     }
// }
//
// fn compute_address_from() {
//     address::msg_addr_from_str()
// }
