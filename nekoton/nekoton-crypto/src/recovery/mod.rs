use anyhow::Error;
use ed25519_dalek::Keypair;

mod durov;
mod ton_labs;
mod util;

pub const LEGACY_MNEMONIC: u8 = 0;
pub const LABS_MNEMONIC: u8 = 1;

pub struct GeneratedData {
    pub words: Vec<String>,
    pub keypair: Keypair,
}

/// Derives keypair from wordlist.
/// 24 words for  [`LEGACY_MNEMONIC`] or 12 for [`LABS_MNEMONIC`]
/// # Arguments
/// * `phrase` 12 or 24 words
///  * `mnemonic_type` -  [`LEGACY_MNEMONIC`] or [`LABS_MNEMONIC`]
pub fn derive_from_words(phrase: &str, mnemonic_type: u8) -> Result<Keypair, Error> {
    anyhow::ensure!(mnemonic_type < 2, "Unsupported mnemonic type");
    match mnemonic_type {
        LEGACY_MNEMONIC => durov::phrase_to_key_durov(phrase),
        LABS_MNEMONIC => ton_labs::derive_from_words_labs(phrase),
        _ => unreachable!(),
    }
}

/// Generates mnemonic and keypair.
/// # Arguments
///  * `mnemonic_type` -  [`LEGACY_MNEMONIC`] or [`LABS_MNEMONIC`]
pub fn generate(mnemonic_type: u8) -> Result<GeneratedData, Error> {
    use ring::rand;
    use ring::rand::SecureRandom;
    anyhow::ensure!(mnemonic_type < 2, "Unsupported mnemonic type");

    let rng = rand::SystemRandom::new();

    let mut entropy = [0; 256 / 8];
    rng.fill(&mut entropy)
        .map_err(|e| anyhow::anyhow!("Failed generating random bytes: {:?}", e))?;
    match mnemonic_type {
        LEGACY_MNEMONIC => durov::generate_durov(entropy),
        LABS_MNEMONIC => ton_labs::generate_words_labs(entropy),
        _ => unreachable!(),
    }
}
