use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;

pub mod adnl;

use ton_api::ton;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct Query {
    query_id: [u8; 32],
    data: Vec<u8>,
}

#[wasm_bindgen]
impl Query {
    #[wasm_bindgen(getter, js_name = "queryId")]
    pub fn qwery_id(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.query_id.as_mut_ptr(), self.query_id.len()) }
    }

    #[wasm_bindgen(getter, js_name = "data")]
    pub fn data(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.data.as_mut_ptr(), self.data.len()) }
    }
}

#[wasm_bindgen]
pub struct AccountId {
    #[wasm_bindgen(skip)]
    pub workchain: i8,
    #[wasm_bindgen(skip)]
    pub id: [u8; 32],
}

#[wasm_bindgen]
impl AccountId {
    #[wasm_bindgen(getter)]
    pub fn workchain(&self) -> i8 {
        self.workchain
    }

    #[wasm_bindgen(getter)]
    pub fn id(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.id.as_mut_ptr(), self.id.len()) }
    }

    #[wasm_bindgen(js_name = "toString")]
    pub fn to_string(&self) -> String {
        format!("{}:{}", self.workchain, hex::encode(&self.id))
    }
}

#[wasm_bindgen]
pub struct LastBlockIdExt {
    #[wasm_bindgen(skip)]
    pub workchain: i8,
    #[wasm_bindgen(skip)]
    pub shard: u64,
    #[wasm_bindgen(skip)]
    pub seqno: u32,
    #[wasm_bindgen(skip)]
    pub root_hash: [u8; 32],
    #[wasm_bindgen(skip)]
    pub file_hash: [u8; 32],
}

#[wasm_bindgen]
impl LastBlockIdExt {
    #[wasm_bindgen(getter)]
    pub fn workchain(&self) -> i8 {
        self.workchain
    }

    #[wasm_bindgen(getter)]
    pub fn shard(&self) -> String {
        self.shard.to_string()
    }

    #[wasm_bindgen(getter)]
    pub fn seqno(&self) -> u32 {
        self.seqno
    }

    #[wasm_bindgen(getter)]
    pub fn root_hash(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.root_hash.as_mut_ptr(), self.root_hash.len()) }
    }

    #[wasm_bindgen(getter)]
    pub fn file_hash(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.file_hash.as_mut_ptr(), self.file_hash.len()) }
    }
}

#[wasm_bindgen]
pub struct AccountState {
    #[wasm_bindgen(skip)]
    pub balance: u64,
}

#[wasm_bindgen]
impl AccountState {
    #[wasm_bindgen(getter)]
    pub fn balance(&self) -> String {
        self.balance.to_string()
    }
}

#[wasm_bindgen]
pub struct AdnlConnection {
    state: adnl::ClientState,
    init_packet: Vec<u8>,
}

#[wasm_bindgen]
impl AdnlConnection {
    #[wasm_bindgen(js_name = "fromKey")]
    pub fn from_key(key: &str) -> Result<AdnlConnection, JsValue> {
        let key = base64::decode(key)
            .map_err(|_| "Invalid key")
            .handle_error()?;
        let key = if key.len() == 32 {
            // SAFETY: key length is always 32
            adnl::ExternalKey::from_public_key(unsafe { &*(key.as_ptr() as *const [u8; 32]) })
        } else {
            return Err("Invalid key").handle_error();
        };

        let (state, init_packet) = adnl::ClientState::init(&key);
        Ok(Self { state, init_packet })
    }

    #[wasm_bindgen(getter, js_name = "initPacket")]
    pub fn init_packet(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.init_packet.as_mut_ptr(), self.init_packet.len()) }
    }

    #[wasm_bindgen(js_name = "getMasterchainInfoPacket")]
    pub fn get_masterchain_info_packet(&mut self) -> Query {
        let (query_id, data) = self.state.build_query(&ton::TLObject::new(
            ton::rpc::lite_server::GetMasterchainInfo,
        ));

        Query { query_id, data }
    }

    #[wasm_bindgen(js_name = "getAccountInfoPacket")]
    pub fn get_account_info_packet(&mut self, last_block_id: &LastBlockIdExt, account_id: &AccountId) -> Query {
        let (query_id, data) = self.state.build_query(&ton::TLObject::new(
            ton::rpc::lite_server::GetAccountState {
                id: ton::ton_node::blockidext::BlockIdExt {
                    workchain: last_block_id.workchain as ton::int,
                    shard: last_block_id.shard as ton::int64,
                    seqno: last_block_id.seqno as ton::int,
                    root_hash: ton::int256(last_block_id.root_hash),
                    file_hash: ton::int256(Default::default()),
                },
                account: ton::lite_server::accountid::AccountId {
                    workchain: account_id.workchain as ton::int,
                    id: ton::int256(account_id.id),
                },
            }
        ));

        Query {
            query_id,
            data,
        }
    }

    #[wasm_bindgen(js_name = "processReceived")]
    pub fn process_received(&mut self, data: &[u8]) -> Option<usize> {
        let query = self.state.handle_query(data)?;
        Some(query.answer.len())
    }
}

#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    console_error_panic_hook::set_once();
    Ok(())
}

pub type Result<T, E = &'static str> = core::result::Result<T, E>;

impl<T> HandleError for Result<T> {
    type Output = T;

    fn handle_error(self) -> Result<Self::Output, JsValue> {
        self.map_err(|e| js_sys::Error::new(&e.to_string()).into())
    }
}

trait HandleError {
    type Output;

    fn handle_error(self) -> Result<Self::Output, JsValue>;
}
