use ed25519_dalek::Keypair;

pub mod durov;
pub mod ton_labs;
mod util;

pub struct GeneratedData {
    words: Vec<String>,
    keypair: Keypair,
}
