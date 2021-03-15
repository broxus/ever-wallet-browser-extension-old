use std::fmt;
use std::fmt::{Debug, Formatter};
use std::io::Read;
use std::num::NonZeroU32;

use anyhow::anyhow;
use anyhow::Error;
use chacha20poly1305::aead::{Aead, NewAead};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use ed25519_dalek::{ed25519, Keypair, Signer};
use ring::rand::SecureRandom;
use ring::{digest, pbkdf2};
use secstr::{SecStr, SecVec};
use serde::{Deserialize, Serialize};
use serde_json::from_reader;

use crate::AccountType;

const NONCE_LENGTH: usize = 12;

const CREDENTIAL_LEN: usize = digest::SHA256_OUTPUT_LEN;

#[cfg(debug_assertions)]
const N_ITER: NonZeroU32 = unsafe { NonZeroU32::new_unchecked(1) };

///Change it to tune number of iterations in pbkdf2 function. Higher number - password bruteforce becomes slower.
/// Initial value is optimal for the current machine, so you maybe want to change it.
#[cfg(not(debug_assertions))]
const N_ITER: NonZeroU32 = unsafe { NonZeroU32::new_unchecked(5_000_000) };

#[derive(Clone)]
pub struct TonSigner {
    inner: CryptoData,
}

impl Debug for TonSigner {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self.inner.pubkey)
    }
}

///Data, stored on disk in `encrypted_data` filed of config.
#[derive(Serialize, Deserialize, Clone)]
struct CryptoData {
    #[serde(with = "hex_encode")]
    salt: Vec<u8>,
    #[serde(with = "hex_encode")]
    ton_encrypted_private_key: Vec<u8>,
    #[serde(with = "hex_nonce")]
    ton_nonce: Nonce,
    account_type: AccountType,
    #[serde(with = "hex_encode")]
    encrypted_seed_phrase: Vec<u8>,
    #[serde(with = "hex_nonce")]
    seed_phrase_nonce: Nonce,
    #[serde(with = "hex_pubkey")]
    pubkey: ed25519_dalek::PublicKey,
}

impl CryptoData {
    pub fn sign(
        &self,
        data: &[u8],
        password: SecStr,
    ) -> Result<[u8; ed25519::SIGNATURE_LENGTH], Error> {
        let key = TonSigner::symmetric_key_from_password(password, &*self.salt);
        let decrypter = ChaCha20Poly1305::new(&key);
        let priv_key = decrypter
            .decrypt(&self.ton_nonce, self.ton_encrypted_private_key.as_slice())
            .map(SecVec::new)
            .map(|x| ed25519_dalek::SecretKey::from_bytes(x.unsecure()))
            .map_err(|e| Error::msg(e.to_string()))??;

        let pair = Keypair {
            secret: priv_key,
            public: self.pubkey,
        };
        Ok(pair.sign(&data).to_bytes())
    }
}

mod hex_encode {
    pub fn serialize<S, T>(data: T, serializer: S) -> Result<S::Ok, S::Error>
    where
        T: AsRef<[u8]> + Sized,
        S: serde::Serializer,
    {
        serializer.serialize_str(&*hex::encode(&data.as_ref()))
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::Error;

        <String as serde::Deserialize>::deserialize(deserializer)
            .and_then(|string| hex::decode(string).map_err(|e| D::Error::custom(e.to_string())))
    }
}

mod hex_pubkey {
    use ed25519_dalek::PublicKey;

    use super::hex_encode;

    pub fn serialize<S>(data: &PublicKey, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&*hex::encode(&data.as_ref()))
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<PublicKey, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::Error;

        hex_encode::deserialize(deserializer).and_then(|x| {
            PublicKey::from_bytes(x.as_slice()).map_err(|e| D::Error::custom(e.to_string()))
        })
    }
}

mod hex_nonce {
    use chacha20poly1305::Nonce;

    use crate::key_management::NONCE_LENGTH;

    use super::hex_encode;

    pub fn serialize<S>(data: &Nonce, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        hex_encode::serialize(data, serializer)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Nonce, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        hex_encode::deserialize(deserializer).and_then(|x| {
            if x.len() != NONCE_LENGTH {
                Err(serde::de::Error::custom(format!(
                    "Bad nonce len: {}, expected: 12",
                    x.len()
                )))
            } else {
                Ok(Nonce::clone_from_slice(&*x))
            }
        })
    }
}

impl TonSigner {
    pub fn public_key(&self) -> &[u8; 32] {
        self.inner.pubkey.as_bytes()
    }

    pub fn sign(
        &self,
        data: &[u8],
        pasword: SecStr,
    ) -> Result<[u8; ed25519::SIGNATURE_LENGTH], Error> {
        self.inner.sign(data, pasword)
    }

    /// Initializes signer from any `reader`, decrypting data.
    pub fn from_reader<T>(reader: T) -> Result<Self, Error>
    where
        T: Read,
    {
        let crypto_data: CryptoData = from_reader(reader)?;

        Ok(TonSigner { inner: crypto_data })
    }

    /// Initializes signer
    /// Returns [`TonSigner`] and Base64 encoded encrypted version of it
    pub fn init(
        password: SecStr,
        ton_key_pair: Keypair,
        account_type: AccountType,
        phrase: &str,
    ) -> Result<Self, Error> {
        use ring::rand;
        let rng = rand::SystemRandom::new();

        let mut salt = vec![0u8; CREDENTIAL_LEN];
        rng.fill(salt.as_mut_slice())
            .map_err(|e| anyhow!("Failed generating random bytes: {:?}", e))?;
        let key = Self::symmetric_key_from_password(password, &salt);
        let chacha_encryptor = ChaCha20Poly1305::new(&key);

        // key encryption
        let (ton_encrypted_private_key, ton_nonce) = {
            let mut nonce_bytes = [0u8; 12];
            rng.fill(&mut nonce_bytes)
                .map_err(|e| anyhow!("Failed generating random bytes: {:?}", e))?;
            let nonce = Nonce::clone_from_slice(&nonce_bytes);
            let private_key =
                Self::encrypt(&chacha_encryptor, &nonce, ton_key_pair.secret.as_ref())?;
            (private_key, nonce)
        };
        let pubkey = ton_key_pair.public;
        drop(ton_key_pair);
        //phrase encryption
        let (encrypted_seed_phrase, seed_phrase_nonce) = {
            let mut nonce_bytes = [0u8; 12];
            rng.fill(&mut nonce_bytes)
                .map_err(|e| anyhow!("Failed generating random bytes: {:?}", e))?;
            let nonce = Nonce::clone_from_slice(&nonce_bytes);
            let data = Self::encrypt(&chacha_encryptor, &nonce, phrase.as_ref())
                .map_err(|e| Error::msg(e.to_string()))?;
            (data, nonce)
        };

        let data = CryptoData {
            salt,
            ton_encrypted_private_key,
            ton_nonce,
            account_type,
            encrypted_seed_phrase,
            seed_phrase_nonce,
            pubkey,
        };

        Ok(Self { inner: data })
    }

    pub fn change_password(
        old_password: SecStr,
        new_password: SecStr,
        data: String,
    ) -> Result<String, Error> {
        let rng = ring::rand::SystemRandom::new();

        let data: CryptoData = serde_json::from_str(&data)?;
        let old_key = Self::symmetric_key_from_password(old_password, &data.salt);

        let mut new_salt = vec![0u8; 12];
        let mut new_seed_nonce = [0u8; 12];
        let mut new_ton_nonce = vec![0u8; 12];

        rng.fill(&mut new_ton_nonce)
            .map_err(|e| anyhow!("Failed generating random bytes: {:?}", e))?;
        rng.fill(&mut new_salt)
            .map_err(|e| anyhow!("Failed generating random bytes: {:?}", e))?;
        rng.fill(&mut new_salt)
            .map_err(|e| anyhow!("Failed generating random bytes: {:?}", e))?;
        rng.fill(&mut new_seed_nonce)
            .map_err(|e| anyhow!("Failed generating random bytes: {:?}", e))?;

        let new_ton_nonce = Nonce::clone_from_slice(&new_ton_nonce);
        let new_seed_nonce = Nonce::clone_from_slice(&new_seed_nonce);
        let new_key = Self::symmetric_key_from_password(new_password, &new_salt);

        let decrypter = ChaCha20Poly1305::new(&old_key);
        let encryptor = ChaCha20Poly1305::new(&new_key);

        let seed_phrase = SecVec::new(
            decrypter
                .decrypt(
                    &data.seed_phrase_nonce,
                    data.encrypted_seed_phrase.as_slice(),
                )
                .map_err(|e| Error::msg(e.to_string()))?,
        );
        let new_encrypted_seed_phrase = encryptor
            .encrypt(&new_seed_nonce, seed_phrase.unsecure())
            .map_err(|e| Error::msg(e.to_string()))?;
        drop(seed_phrase);

        let kp = Self::ton_private_key_from_encrypted(
            &*data.ton_encrypted_private_key,
            &old_key,
            &data.ton_nonce,
        )?;

        let new_encrypted_private_key = encryptor
            .encrypt(&new_ton_nonce, kp.secret.as_ref())
            .map_err(|e| Error::msg(e.to_string()))?;

        drop(kp);

        Ok(serde_json::to_string(&CryptoData {
            ton_nonce: new_ton_nonce,
            account_type: data.account_type,
            encrypted_seed_phrase: new_encrypted_seed_phrase,
            seed_phrase_nonce: new_seed_nonce,
            ton_encrypted_private_key: new_encrypted_private_key,
            salt: new_salt,
            pubkey: data.pubkey,
        })?)
    }

    ///Calculates symmetric key from user password, using pbkdf2
    fn symmetric_key_from_password(password: SecStr, salt: &[u8]) -> Key {
        let mut pbkdf2_hash = SecVec::new(vec![0; CREDENTIAL_LEN]);
        pbkdf2::derive(
            pbkdf2::PBKDF2_HMAC_SHA256,
            N_ITER,
            salt,
            password.unsecure(),
            &mut pbkdf2_hash.unsecure_mut(),
        );
        chacha20poly1305::Key::clone_from_slice(&pbkdf2_hash.unsecure())
    }

    fn encrypt(enc: &ChaCha20Poly1305, nonce: &Nonce, data: &[u8]) -> Result<Vec<u8>, Error> {
        enc.encrypt(nonce, data)
            .map_err(|e| Error::msg(e.to_string()).context("Failed encrypting private key"))
    }

    fn ton_private_key_from_encrypted(
        encrypted_key: &[u8],
        key: &Key,
        nonce: &Nonce,
    ) -> Result<ed25519_dalek::Keypair, Error> {
        let decrypter = ChaCha20Poly1305::new(&key);

        decrypter
            .decrypt(nonce, encrypted_key)
            .map_err(|_| anyhow!("Failed decrypting with provided password"))
            .and_then(|data| {
                let secret = ed25519_dalek::SecretKey::from_bytes(&data)
                    .map_err(|e| anyhow!("failed to load ton key. {}", e.to_string()))?;
                let public = ed25519_dalek::PublicKey::from(&secret);
                Ok(Keypair { secret, public })
            })
    }
}
//todo fake key

#[cfg(test)]
mod test {
    use secstr::SecStr;

    use crate::key_management::TonSigner;

    fn default_keys() -> ed25519_dalek::Keypair {
        let ton_private_key = ed25519_dalek::SecretKey::from_bytes(
            &hex::decode("e371ef1d7266fc47b30d49dc886861598f09e2e6294d7f0520fe9aa460114e51")
                .unwrap(),
        )
        .unwrap();
        let ton_public_key = ed25519_dalek::PublicKey::from(&ton_private_key);
        let ton_key_pair = ed25519_dalek::Keypair {
            secret: ton_private_key,
            public: ton_public_key,
        };

        ton_key_pair
    }

    #[test]
    fn test_init() {
        let password = SecStr::new("123".into());

        let ton_key_pair = default_keys();

        let (signer, data) = TonSigner::init(password.clone(), ton_key_pair).unwrap();
        let read_signer = TonSigner::from_reader(data.as_bytes(), password).unwrap();

        assert_eq!(read_signer, signer);
    }

    #[test]
    fn test_bad_password() {
        let password = SecStr::new("123".into());

        let ton_key_pair = default_keys();

        let (_, data) = TonSigner::init(password, ton_key_pair).unwrap();
        let result = TonSigner::from_reader(data.as_bytes(), SecStr::new("lol".into()));
        assert!(result.is_err());
    }
}
