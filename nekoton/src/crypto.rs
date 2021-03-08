use js_sys::{Error, JsString};

use nekoton_crypto::TonSigner;
pub use nekoton_crypto::{LABS_MNEMONIC, LEGACY_MNEMONIC};

struct CryptoHandler {
    signer: TonSigner,
}

impl CryptoHandler {
    /// Decrypts user data and returns signer
    pub fn decrypt(password: JsString, data: JsString) -> Result<Self, Error> {
        let data: String = data.into();
        let pass: String = password.into();
        Ok(CryptoHandler {
            signer: TonSigner::from_reader(data.as_bytes(), pass.into())
                .map_err(|e| Error::new(&e.to_string()))?,
        })
    }
    /// Creates ['CryptoHandler'] from mnemonic
    /// # Arguments
    /// * `mnemonic` - 12 or 24 words, depending on mnemonic type - [`LABS_MNEMONIC`] or [`LEGACY_MNEMONIC`] set in `mnemonic_type`
    pub fn restore_from_mnemonic(
        mnemonic: JsString,
        mnemonic_type: u8,
        password: String,
    ) -> Result<(Self, JsString), Error> {
        let mnemonic: String = mnemonic.into();
        let data = nekoton_crypto::derive_from_words(&mnemonic, mnemonic_type)
            .map_err(|e| Error::new(&e.to_string()))?;
        let (signer, encrypted_data) =
            TonSigner::init(password.into(), data).map_err(|e| Error::new(&e.to_string()))?;
        let handler = CryptoHandler { signer };
        Ok((handler, encrypted_data.into()))
    }

    pub fn create(
        mnemonic_type: u8,
        password: String,
    ) -> Result<(Self, JsString, JsString), Error> {
        let data =
            nekoton_crypto::generate(mnemonic_type).map_err(|e| Error::new(&e.to_string()))?;
        let (signer, encrypted_data) = TonSigner::init(password.into(), data.keypair)
            .map_err(|e| Error::new(&e.to_string()))?;
        let handler = CryptoHandler { signer };
        Ok((handler, encrypted_data.into(), data.words.join(" ").into()))
    }

    pub fn change_password(
        old_password: JsString,
        new_password: JsString,
        encrypted_data: JsString,
    ) -> Result<JsString, Error> {
        let (old_password, new_password, encrypted_data): (String, String, String) = (
            old_password.into(),
            new_password.into(),
            encrypted_data.into(),
        );
        let data = TonSigner::reencrypt(old_password.into(), new_password.into(), encrypted_data)
            .map_err(|e| Error::new(&e.to_string()))?;
        Ok(data.into())
    }
}
