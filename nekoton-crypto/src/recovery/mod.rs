use anyhow::Error;
use ed25519_dalek::Keypair;
use serde::{Deserialize, Serialize};

mod durov;
mod ton_labs;
mod util;

pub const LEGACY_MNEMONIC: u8 = 0;
pub const LABS_MNEMONIC: u8 = 1;

#[derive(Serialize, Deserialize, Copy, Clone)]
pub enum AccountType {
    Legacy,
    LabsDefault,
    LabsDerived(u16),
}

pub struct GeneratedData {
    pub words: Vec<String>,
    pub keypair: Keypair,
}

/// Derives keypair from wordlist.
/// 24 words for  [`LEGACY_MNEMONIC`] or 12 for [`LABS_MNEMONIC`]
/// # Arguments
/// * `phrase` 12 or 24 words
///  * `mnemonic_type` -  [`LEGACY_MNEMONIC`] or [`LABS_MNEMONIC`]
pub fn derive_from_words(mnemonic: &str, account_type: AccountType) -> Result<Keypair, Error> {
    match account_type {
        AccountType::Legacy => durov::phrase_to_key_durov(&mnemonic),
        AccountType::LabsDefault => ton_labs::derive_from_words_labs(&mnemonic, 0),
        AccountType::LabsDerived(id) => ton_labs::derive_from_words_labs(&mnemonic, id),
    }
}

/// Generates mnemonic and keypair.
pub fn generate(account_type: AccountType) -> Result<GeneratedData, Error> {
    use ring::rand;
    use ring::rand::SecureRandom;

    let rng = rand::SystemRandom::new();

    let mut entropy = [0; 256 / 8];
    rng.fill(&mut entropy)
        .map_err(|e| anyhow::anyhow!("Failed generating random bytes: {:?}", e))?;
    match account_type {
        AccountType::Legacy => durov::generate_durov(entropy),
        AccountType::LabsDefault => ton_labs::generate_words_labs(entropy, 0),
        AccountType::LabsDerived(id) => ton_labs::generate_words_labs(entropy, id),
    }
}
