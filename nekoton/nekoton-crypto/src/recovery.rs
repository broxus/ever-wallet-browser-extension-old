use anyhow::Error;
use bip39::{Language, Seed};
use tiny_hderive::bip32::ExtendedPrivKey;

pub fn derive_from_words_ton(
    lang: Language,
    phrase: &str,
    derivation_path: Option<&str>,
) -> Result<ed25519_dalek::Keypair, Error> {
    let mnemonic = bip39::Mnemonic::from_phrase(phrase, lang)?;
    let hd = Seed::new(&mnemonic, "");
    let seed_bytes = hd.as_bytes();

    let path = derivation_path.unwrap_or("m/44'/396'/0'/0/0");
    let derived =
        ExtendedPrivKey::derive(seed_bytes, path).map_err(|e| Error::msg(format!("{:#?}", e)))?;

    ed25519_keys_from_secret_bytes(&derived.secret())
}

fn ed25519_keys_from_secret_bytes(bytes: &[u8]) -> Result<ed25519_dalek::Keypair, Error> {
    let secret = ed25519_dalek::SecretKey::from_bytes(bytes).map_err(|e| {
        Error::msg(format!(
            "failed to import ton secret key. {}",
            e.to_string()
        ))
    })?;

    let public = ed25519_dalek::PublicKey::from(&secret);

    Ok(ed25519_dalek::Keypair { secret, public })
}

#[cfg(test)]
mod test {
    use crate::recovery::derive_from_words_ton;
    use bip39::Language;

    #[test]
    fn bad_mnemonic() {
        let key = derive_from_words_ton(
            Language::English,
            "pioneer fever hazard scam install wise reform corn bubble leisure amazing note",
            None,
        );
        assert!(key.is_err());
    }

    #[test]
    fn ton_recovery() {
        let key = derive_from_words_ton(
            Language::English,
            "pioneer fever hazard scan install wise reform corn bubble leisure amazing note",
            None,
        )
        .unwrap();
        let secret = key.secret;

        let target_secret = ed25519_dalek::SecretKey::from_bytes(
            &hex::decode("e371ef1d7266fc47b30d49dc886861598f09e2e6294d7f0520fe9aa460114e51")
                .unwrap(),
        )
        .unwrap();

        assert_eq!(secret.as_bytes(), target_secret.as_bytes())
    }
}
