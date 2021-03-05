use std::fmt;
use std::fmt::{Debug, Formatter};
use std::fs::File;
use std::num::NonZeroU32;
use std::path::Path;
use anyhow::Error;
use ed25519_dalek::{ed25519, Keypair, Signer,};
use rand::prelude::*;
use ring::{digest, pbkdf2};
use secstr::{SecStr, SecVec};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::{from_reader, to_writer_pretty};
use sodiumoxide::crypto::secretbox;
use sodiumoxide::crypto::secretbox::{Key, Nonce};
use std::sync::Arc;
use std::io::{Read, Write};
use anyhow::anyhow;


const CREDENTIAL_LEN: usize = digest::SHA256_OUTPUT_LEN;

#[cfg(debug_assertions)]
const N_ITER: NonZeroU32 = unsafe { NonZeroU32::new_unchecked(1) };

///Change it to tune number of iterations in pbkdf2 function. Higher number - password bruteforce becomes slower.
/// Initial value is optimal for the current machine, so you maybe want to change it.
#[cfg(not(debug_assertions))]
const N_ITER: NonZeroU32 = unsafe { NonZeroU32::new_unchecked(5_000_000) };


#[derive(Clone)]
pub struct TonSigner {
    inner: Arc<Keypair>,
}

impl Eq for TonSigner {}

impl PartialEq for TonSigner {
    fn eq(&self, other: &Self) -> bool {
        self.inner
            .secret
            .as_bytes()
            .eq(other.inner.secret.as_bytes())
    }
}

impl Debug for TonSigner {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self.inner.public)
    }
}



///Data, stored on disk in `encrypted_data` filed of config.
#[derive(Serialize, Deserialize)]
struct CryptoData {
    #[serde(serialize_with = "buffer_to_hex", deserialize_with = "hex_to_buffer")]
    salt: Vec<u8>,
    #[serde(serialize_with = "buffer_to_hex", deserialize_with = "hex_to_buffer")]
    ton_encrypted_private_key: Vec<u8>,
    #[serde(
    serialize_with = "serialize_nonce",
    deserialize_with = "deserialize_nonce"
    )]
    ton_nonce: Nonce,
}

/// Serializes `buffer` to a lowercase hex string.
pub fn buffer_to_hex<T, S>(buffer: &T, serializer: S) -> Result<S::Ok, S::Error>
    where
        T: AsRef<[u8]> + ?Sized,
        S: Serializer,
{
    serializer.serialize_str(&*hex::encode(&buffer.as_ref()))
}

/// Deserializes a lowercase hex string to a `Vec<u8>`.
pub fn hex_to_buffer<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: Deserializer<'de>,
{
    use serde::de::Error;
    <String as serde::Deserialize>::deserialize(deserializer)
        .and_then(|string| hex::decode(string).map_err(|e| D::Error::custom(e.to_string())))
}

fn serialize_nonce<S>(t: &Nonce, ser: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
{
    buffer_to_hex(&t[..], ser)
}

fn deserialize_nonce<'de, D>(deser: D) -> Result<Nonce, D::Error>
    where
        D: Deserializer<'de>,
{
    hex_to_buffer(deser).and_then(|x| {
        Nonce::from_slice(&*x).ok_or_else(|| serde::de::Error::custom("Failed deserializing nonce"))
    })
}



impl TonSigner {
    pub fn public_key(&self) -> &[u8; 32] {
        self.inner.public.as_bytes()
    }

    pub fn sign(&self, data: &[u8]) -> [u8; ed25519::SIGNATURE_LENGTH] {
        self.inner.sign(data).to_bytes()
    }

    pub fn keypair(&self) -> Arc<ed25519_dalek::Keypair> {
        self.inner.clone()
    }
}

impl TonSigner {
    pub fn from_reader<T>(reader: T, password: SecStr) -> Result<Self, Error>
        where
            T: Read,
    {

        let crypto_data: CryptoData = from_reader(reader)?;
        let sym_key = Self::symmetric_key_from_password(password, &*crypto_data.salt);


        let ton_data = Self::ton_private_key_from_encrypted(
            &crypto_data.ton_encrypted_private_key,
            &sym_key,
            &crypto_data.ton_nonce,
        )?;

        Ok( TonSigner {
                inner: Arc::new(ton_data),
            })
    }

    pub fn init<T>(
        pem_file_path: T,
        password: SecStr,
        ton_key_pair: ed25519_dalek::Keypair,
    ) -> Result<Self, Error>
        where
            T: Write,
    {
        sodiumoxide::init().expect("Failed initializing libsodium");

        let mut rng = rand::rngs::OsRng::new().expect("OsRng fail");
        let mut salt = vec![0u8; CREDENTIAL_LEN];
        rng.fill(salt.as_mut_slice());
        let key = Self::symmetric_key_from_password(password, &salt);


        // TON
        let (ton_encrypted_private_key, ton_nonce) = {
            let nonce = secretbox::gen_nonce();
            let private_key = secretbox::seal(ton_key_pair.secret.as_bytes(), &nonce, &key);
            (private_key, nonce)
        };

        //
        let data = CryptoData {
            salt,
            ton_encrypted_private_key,
            ton_nonce,
        };

        to_writer_pretty(pem_file_path, &data)?;
        Ok(Self {
                inner: Arc::new(ton_key_pair),
        })
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
        secretbox::Key::from_slice(&pbkdf2_hash.unsecure()).expect("Shouldn't panic")
    }


    fn ton_private_key_from_encrypted(
        encrypted_key: &[u8],
        key: &Key,
        nonce: &Nonce,
    ) -> Result<ed25519_dalek::Keypair, Error> {
        secretbox::open(encrypted_key, nonce, key)
            .map_err(|_| anyhow!("Failed decrypting with provided password"))
            .and_then(|data| {
                let secret = ed25519_dalek::SecretKey::from_bytes(&data)
                    .map_err(|e| anyhow!("failed to load ton key. {}", e.to_string()))?;
                let public = ed25519_dalek::PublicKey::from(&secret);
                Ok(Keypair { secret, public })
            })
    }
}

#[cfg(test)]
mod test {
    use std::str::FromStr;

    use bip39::Language;
    use secstr::SecStr;
    use crate::key_managment::TonSigner;
    use std::io::{Write, Read};


    fn default_keys() ->  ed25519_dalek::Keypair {
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

        let  ton_key_pair = default_keys();
        let mut data_store = vec![0;1024*1024];
        let data_store1 = vec![0;1024*1024];;
        let signer = TonSigner::init(data_store.as_mut_slice(), password.clone(), ton_key_pair).unwrap();
        let read_signer = TonSigner::from_reader(&*data_store1, password).unwrap();

        assert_eq!(read_signer, signer);
    }

    #[test]
    fn test_bad_password() {
        let password = SecStr::new("123".into());
        let mut data_store =vec![0;1024*1024];;

        let ton_key_pair = default_keys();

        TonSigner::init(data_store.as_mut_slice() , password,  ton_key_pair).unwrap();
        let result = TonSigner::from_reader(&*data_store , SecStr::new("lol".into()));
        assert!(result.is_err());
    }

    #[test]
    fn test_size() {
        assert_eq!(
            sodiumoxide::crypto::secretbox::xsalsa20poly1305::KEYBYTES,
            ring::digest::SHA256_OUTPUT_LEN
        );
    }


}
