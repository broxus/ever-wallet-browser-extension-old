use sha2::digest::{FixedOutput};
use aes_ctr::cipher::SyncStreamCipher;
use rand::{Rng, CryptoRng, RngCore};

use ton_api::ton;

pub struct ClientState {
    crypto: AdnlStreamCrypto,
}

impl ClientState {
    pub fn init(server_key: &ExternalKey) -> (Self, Vec<u8>) {
        let mut rng = rand::thread_rng();
        let (crypto, nonce) = AdnlStreamCrypto::new_with_nonce(&mut rng);

        let client = Self {
            crypto,
        };
        let init_packet = build_adnl_handshake_packet(&nonce, &LocalKey::generate(&mut rng), server_key);

        (client, init_packet)
    }

    pub fn build_ping_query(&self) -> (QueryId, Vec<u8>) {
        let mut rng = rand::thread_rng();
        let value = rng.gen();
        let query = ton::TLObject::new(ton::rpc::adnl::Ping { value });
        build_adnl_message(&mut rng, &query)
    }

    pub fn build_query(&self, query: &ton::TLObject) -> (QueryId, Vec<u8>) {
        let mut rng = rand::thread_rng();
        build_adnl_message(&mut rng, query)
    }
}

type QueryId = [u8; 32];

fn build_adnl_message<T>(rng: &mut T, data: &ton::TLObject) -> (QueryId, Vec<u8>)
    where T: RngCore
{
    const ADNL_MESSAGE_ID: u32 = 0xb48bf97a;

    let query_id: QueryId = rng.gen();
    let mut result: Vec<u8> = Vec::with_capacity(4 + query_id.len());
    result.extend(&ADNL_MESSAGE_ID.to_le_bytes());
    result.extend(&query_id);
    ton_api::Serializer::new(&mut result).write_boxed(data).expect("Shouldn't fail");
    (query_id, result)
}

struct AdnlStreamCrypto {
    cipher_receive: aes_ctr::Aes256Ctr,
    cipher_send: aes_ctr::Aes256Ctr,
}

impl AdnlStreamCrypto {
    fn new_with_nonce<T>(rng: &mut T) -> (Self, Vec<u8>)
        where T: CryptoRng + RngCore
    {
        let nonce: Vec<u8> = (0..160).map(|_| rng.gen()).collect();

        // SAFETY: buffer size is always greater than 96
        let crypto = unsafe {
            let rx_key = nonce.as_ptr().offset(0) as *const [u8; 32];
            let rx_ctr = nonce.as_ptr().offset(64) as *const [u8; 16];

            let tx_key = nonce.as_ptr().offset(32) as *const [u8; 32];
            let tx_ctr = nonce.as_ptr().offset(80) as *const [u8; 16];

            Self {
                cipher_receive: build_cipher(&*rx_key, &*rx_ctr),
                cipher_send: build_cipher(&*tx_key, &*tx_ctr),
            }
        };

        (crypto, nonce)
    }

    fn pack(&mut self, data: &[u8]) -> Vec<u8> {
        use sha2::Digest;

        let nonce: [u8; 32] = rand::thread_rng().gen();

        let data_len = data.len();
        let mut result = Vec::with_capacity(data_len + 68);
        result.extend(&((data_len + 64) as u32).to_le_bytes());
        result.extend(&nonce);
        result.extend(data);

        let checksum = sha2::Sha256::digest(&result[4..]);
        result.extend(checksum.as_slice());

        self.cipher_send.apply_keystream(result.as_mut());
        result
    }
}

fn build_adnl_handshake_packet(buffer: &[u8], local: &LocalKey, other: &ExternalKey) -> Vec<u8> {
    use sha2::Digest;

    let checksum = sha2::Sha256::digest(buffer);

    let data_len = buffer.len();
    let mut result = Vec::with_capacity(data_len + 96);
    result.extend(other.id.inner());
    result.extend(&local.public_key);
    result.extend(checksum.as_slice());
    result.extend(buffer);

    let mut shared_secret = calculate_shared_secret(&local.private_key, &other.public_key);
    build_packet_cipher(&shared_secret, checksum.as_ref()).apply_keystream(&mut result[96..]);
    result
}

#[derive(Debug, Eq, Hash, Ord, PartialOrd, PartialEq)]
struct KeyId([u8; 32]);

impl KeyId {
    pub fn new(buffer: &[u8; 32]) -> Self
    {
        Self(*buffer)
    }

    pub fn inner(&self) -> &[u8; 32] {
        &self.0
    }
}

#[derive(Debug)]
struct LocalKey {
    id: KeyId,
    public_key: [u8; 32],
    private_key: [u8; 64],
}

impl LocalKey {
    fn generate<T>(rng: &mut T) -> Self
        where T: CryptoRng + RngCore
    {
        Self::from_ed25519_secret_key(&ed25519_dalek::SecretKey::generate(rng))
    }

    fn from_ed25519_secret_key(private_key: &ed25519_dalek::SecretKey) -> Self {
        Self::from_ed25519_expanded_secret_key(&ed25519_dalek::ExpandedSecretKey::from(private_key))
    }

    fn from_ed25519_expanded_secret_key(expended_secret_key: &ed25519_dalek::ExpandedSecretKey) -> Self {
        let public_key = ed25519_dalek::PublicKey::from(expended_secret_key).to_bytes();

        Self {
            id: calculate_id(KEY_ED25519, &public_key),
            public_key,
            private_key: expended_secret_key.to_bytes(),
        }
    }
}

#[derive(Debug)]
pub struct ExternalKey {
    id: KeyId,
    public_key: [u8; 32],
}

impl ExternalKey {
    pub fn from_public_key(public_key: &[u8; 32]) -> Self {
        Self {
            id: calculate_id(KEY_ED25519, public_key),
            public_key: *public_key,
        }
    }
}

fn calculate_id(type_id: i32, pub_key: &[u8; 32]) -> KeyId {
    use sha2::Digest;

    let mut buffer = sha2::Sha256::new();
    buffer.update(&type_id.to_le_bytes());
    buffer.update(pub_key);
    KeyId::new(buffer.finalize_fixed().as_ref())
}

fn calculate_shared_secret(private_key: &[u8; 64], public_key: &[u8; 32]) -> [u8; 32] {
    let point = curve25519_dalek::edwards::CompressedEdwardsY(*public_key)
        .decompress()
        .expect("Invalid public key")
        .to_montgomery()
        .to_bytes();

    let mut buffer = [0; 32];
    buffer.copy_from_slice(&private_key[..32]);
    x25519_dalek::x25519(buffer, point)
}

fn build_packet_cipher(shared_secret: &[u8; 32], checksum: &[u8; 32]) -> aes_ctr::Aes256Ctr {
    let mut aes_key_bytes = [0; 32];
    aes_key_bytes[..16].copy_from_slice(&shared_secret[..16]);
    aes_key_bytes[16..].copy_from_slice(&checksum[16..]);

    let mut aes_ctr_bytes = [0; 16];
    aes_ctr_bytes[..4].copy_from_slice(&checksum[..4]);
    aes_ctr_bytes[4..].copy_from_slice(&shared_secret[20..]);

    build_cipher(&aes_key_bytes, &aes_ctr_bytes)
}

fn build_cipher(key: &[u8; 32], ctr: &[u8; 16]) -> aes_ctr::Aes256Ctr {
    use aes_ctr::cipher::NewStreamCipher;
    aes_ctr::Aes256Ctr::new(key.into(), ctr.into())
}

pub const KEY_ED25519: i32 = 1209251014;
