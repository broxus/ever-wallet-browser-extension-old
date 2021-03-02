use std::str::FromStr;

use js_sys::{Array, Uint8Array};
use ton_api::ton;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

pub mod adnl;

use self::adnl::Query;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    console_error_panic_hook::set_once();
    Ok(())
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

    #[wasm_bindgen(js_name = "handleInitPacket")]
    pub fn handle_init_response(&mut self, data: &mut [u8]) {
        self.state.handle_init_response(data);
    }

    #[wasm_bindgen(js_name = "getMasterchainInfo")]
    pub fn get_masterchain_info(&mut self) -> QueryGetMasterchainInfo {
        let query = self.state.build_query(&ton::TLObject::new(
            ton::rpc::lite_server::GetMasterchainInfo,
        ));
        QueryGetMasterchainInfo { query }
    }

    #[wasm_bindgen(js_name = "getAccountState")]
    pub fn get_account_state(
        &mut self,
        last_block_id: &LastBlockIdExt,
        account_id: &AccountId,
    ) -> QueryAccountState {
        let query = self.state.build_query(&ton::TLObject::new(
            ton::rpc::lite_server::GetAccountState {
                id: ton::ton_node::blockidext::BlockIdExt {
                    workchain: last_block_id.workchain as ton::int,
                    shard: last_block_id.shard as ton::int64,
                    seqno: last_block_id.seqno as ton::int,
                    root_hash: ton::int256(last_block_id.root_hash),
                    file_hash: ton::int256(last_block_id.file_hash),
                },
                account: ton::lite_server::accountid::AccountId {
                    workchain: account_id.workchain as ton::int,
                    id: ton::int256(account_id.id),
                },
            },
        ));

        QueryAccountState {
            account_addr: ton_types::UInt256::from(account_id.id),
            query,
        }
    }

    #[wasm_bindgen(js_name = "getTransactions")]
    pub fn get_transactions(
        &mut self,
        account_id: &AccountId,
        from: &TransactionId,
        count: u8,
    ) -> QueryGetTransactions {
        let query = self.state.build_query(&ton::TLObject::new(
            ton::rpc::lite_server::GetTransactions {
                count: count as i32,
                account: ton::lite_server::accountid::AccountId {
                    workchain: account_id.workchain as i32,
                    id: ton::int256(account_id.id),
                },
                lt: from.lt as i64,
                hash: ton::int256(from.hash),
            },
        ));
        QueryGetTransactions { query }
    }

    #[wasm_bindgen(js_name = "sendMessage")]
    pub fn send_message(&mut self, data: Box<[u8]>) -> QuerySendMessage {
        let query =
            self.state
                .build_query(&ton::TLObject::new(ton::rpc::lite_server::SendMessage {
                    body: ton::bytes(data.into_vec()),
                }));
        QuerySendMessage { query }
    }
}

#[wasm_bindgen]
pub struct QueryGetMasterchainInfo {
    #[wasm_bindgen(skip)]
    pub query: Query,
}

#[wasm_bindgen]
impl QueryGetMasterchainInfo {
    #[wasm_bindgen(getter)]
    pub fn data(&mut self) -> Uint8Array {
        self.query.js_data()
    }

    #[wasm_bindgen(js_name = "onResponse")]
    pub fn on_response(
        &self,
        connection: &mut AdnlConnection,
        data: &[u8],
    ) -> Result<Option<LastBlockIdExt>, JsValue> {
        Ok(self
            .query
            .handle_result::<ton::rpc::lite_server::GetMasterchainInfo>(connection, data)?
            .map(|info| LastBlockIdExt {
                workchain: info.last().workchain as i8,
                shard: info.last().shard as u64,
                seqno: info.last().seqno as u32,
                root_hash: info.last().root_hash.0,
                file_hash: info.last().file_hash.0,
            }))
    }
}

#[wasm_bindgen]
pub struct QueryAccountState {
    #[wasm_bindgen(skip)]
    pub account_addr: ton_types::UInt256,
    #[wasm_bindgen(skip)]
    pub query: Query,
}

#[wasm_bindgen]
impl QueryAccountState {
    #[wasm_bindgen(getter)]
    pub fn data(&mut self) -> Uint8Array {
        self.query.js_data()
    }

    #[wasm_bindgen(js_name = "onResponse")]
    pub fn on_response(
        &self,
        connection: &mut AdnlConnection,
        data: &[u8],
    ) -> Result<Option<AccountState>, JsValue> {
        use ton_block::{Deserializable, HashmapAugType};

        let response = match self
            .query
            .handle_result::<ton::rpc::lite_server::GetAccountState>(connection, data)?
        {
            Some(response) => response.only(),
            None => return Ok(None),
        };

        match ton_block::Account::construct_from_bytes(&response.state.0) {
            Ok(ton_block::Account::Account(info)) => {
                let q_roots =
                    ton_types::deserialize_cells_tree(&mut std::io::Cursor::new(&response.proof.0))
                        .map_err(|_| QueryAccountStateError::InvalidAccountStateProof)
                        .handle_error()?;
                if q_roots.len() != 2 {
                    return Err(QueryAccountStateError::InvalidAccountStateProof).handle_error();
                }

                let merkle_proof = ton_block::MerkleProof::construct_from_cell(q_roots[0].clone())
                    .map_err(|_| QueryAccountStateError::InvalidAccountStateProof)
                    .handle_error()?;
                let proof_root = merkle_proof.proof.virtualize(1);

                let ss = ton_block::ShardStateUnsplit::construct_from(&mut proof_root.into())
                    .map_err(|_| QueryAccountStateError::InvalidAccountStateProof)
                    .handle_error()?;

                let shard_info = ss
                    .read_accounts()
                    .map_err(|_| QueryAccountStateError::InvalidAccountStateProof)
                    .handle_error()?
                    .get(&self.account_addr)
                    .handle_error()?
                    .ok_or(QueryAccountStateError::AccountNotFound)
                    .handle_error()?;

                Ok(Some(AccountState {
                    last_trans_id: TransactionId {
                        lt: shard_info.last_trans_lt(),
                        hash: shard_info.last_trans_hash().clone().into(),
                    },
                    gen_lt: ss.gen_lt(),
                    gen_utime: ss.gen_time(),
                    balance: info.storage.balance.grams.0 as u64,
                }))
            }
            Ok(_) => Err(QueryAccountStateError::AccountNotFound).handle_error(),
            Err(_) => Err(QueryAccountStateError::InvalidAccountState).handle_error(),
        }
    }
}

#[derive(thiserror::Error, Debug)]
pub enum QueryAccountStateError {
    #[error("Account not found")]
    AccountNotFound,
    #[error("Invalid account state")]
    InvalidAccountState,
    #[error("Invalid account state proof")]
    InvalidAccountStateProof,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Array<Transaction>")]
    pub type TransactionsArray;
}

#[wasm_bindgen]
pub struct QueryGetTransactions {
    #[wasm_bindgen(skip)]
    pub query: Query,
}

#[wasm_bindgen]
impl QueryGetTransactions {
    #[wasm_bindgen(getter)]
    pub fn data(&mut self) -> Uint8Array {
        self.query.js_data()
    }

    #[wasm_bindgen(js_name = "onResponse")]
    pub fn on_response(
        &self,
        connection: &mut AdnlConnection,
        data: &[u8],
    ) -> Result<Option<TransactionsArray>, JsValue> {
        use ton_block::Deserializable;

        let transactions = match self
            .query
            .handle_result::<ton::rpc::lite_server::GetTransactions>(connection, data)?
        {
            Some(data) => data.only().transactions.0,
            None => return Ok(None),
        };
        let transactions =
            ton_types::deserialize_cells_tree(&mut std::io::Cursor::new(transactions))
                .map_err(|_| "Failed to deserialize transactions list")
                .handle_error()?;

        let result = transactions
            .into_iter()
            .map::<Result<JsValue, JsValue>, _>(|item| {
                let hash = item.repr_hash();
                let transaction = ton_block::Transaction::construct_from_cell(item)
                    .map_err(|_| "Failed to deserialize transaction")
                    .handle_error()?;
                Ok(JsValue::from(Transaction {
                    id: TransactionId {
                        lt: transaction.lt,
                        hash: hash.into(),
                    },
                    prev_trans_id: (transaction.prev_trans_lt != 0).then(|| TransactionId {
                        lt: transaction.prev_trans_lt,
                        hash: transaction.prev_trans_hash.into(),
                    }),
                    now: transaction.now,
                }))
            })
            .collect::<Result<Array, _>>()?
            .unchecked_into::<TransactionsArray>();

        Ok(Some(result))
    }
}

#[wasm_bindgen]
pub struct QuerySendMessage {
    #[wasm_bindgen(skip)]
    pub query: Query,
}

#[wasm_bindgen]
impl QuerySendMessage {
    #[wasm_bindgen(getter)]
    pub fn data(&mut self) -> Uint8Array {
        self.query.js_data()
    }

    #[wasm_bindgen(js_name = "onResponse")]
    pub fn on_response(
        &self,
        connection: &mut AdnlConnection,
        data: &[u8],
    ) -> Result<Option<i32>, JsValue> {
        Ok(self
            .query
            .handle_result::<ton::rpc::lite_server::SendMessage>(connection, data)?
            .map(|status| status.only().status))
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
    #[wasm_bindgen]
    pub fn parse(address: &str) -> Result<AccountId, JsValue> {
        let address = ton_block::MsgAddressInt::from_str(address)
            .map_err(|_| "Invalid address")
            .handle_error()?;
        Ok(AccountId {
            workchain: address.workchain_id() as i8,
            id: ton_types::UInt256::from(address.address().get_bytestring(0)).into(),
        })
    }

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
#[derive(Clone)]
pub struct TransactionId {
    #[wasm_bindgen(skip)]
    pub lt: u64,
    #[wasm_bindgen(skip)]
    pub hash: [u8; 32],
}

#[wasm_bindgen]
impl TransactionId {
    #[wasm_bindgen(getter)]
    pub fn lt(&self) -> String {
        self.lt.to_string()
    }

    #[wasm_bindgen(getter)]
    pub fn hash(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.hash.as_mut_ptr(), self.hash.len()) }
    }

    #[wasm_bindgen(js_name = "toString")]
    pub fn to_string(&self) -> String {
        hex::encode(&self.hash)
    }
}

#[wasm_bindgen]
pub struct Transaction {
    #[wasm_bindgen(skip)]
    pub id: TransactionId,
    #[wasm_bindgen(skip)]
    pub prev_trans_id: Option<TransactionId>,
    #[wasm_bindgen(skip)]
    pub now: u32,
}

#[wasm_bindgen]
impl Transaction {
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> TransactionId {
        self.id.clone()
    }

    #[wasm_bindgen(getter, js_name = "previousTransactionId")]
    pub fn previous_transaction_id(&mut self) -> Option<TransactionId> {
        self.prev_trans_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn now(&self) -> u32 {
        self.now
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
    pub last_trans_id: TransactionId,
    #[wasm_bindgen(skip)]
    pub gen_lt: u64,
    #[wasm_bindgen(skip)]
    pub gen_utime: u32,
    #[wasm_bindgen(skip)]
    pub balance: u64,
}

#[wasm_bindgen]
impl AccountState {
    #[wasm_bindgen(getter, js_name = "lastTransactionId")]
    pub fn last_trans_id(&self) -> Option<TransactionId> {
        (self.last_trans_id.lt != 0).then(|| self.last_trans_id.clone())
    }

    #[wasm_bindgen(getter, js_name = "genLt")]
    pub fn gen_lt(&self) -> String {
        self.gen_lt.to_string()
    }

    #[wasm_bindgen(getter, js_name = "genUnixTime")]
    pub fn gen_utime(&self) -> u32 {
        self.gen_utime
    }

    #[wasm_bindgen(getter)]
    pub fn balance(&self) -> String {
        self.balance.to_string()
    }
}

impl Query {
    pub fn js_data(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.data.as_mut_ptr(), self.data.len()) }
    }

    pub fn handle_result<T>(
        &self,
        connection: &mut AdnlConnection,
        data: &[u8],
    ) -> Result<Option<T::Reply>, JsValue>
    where
        T: ton_api::Function,
    {
        let query = match connection.state.handle_query(data).handle_error()? {
            Some(query) => query,
            None => return Ok(None),
        };

        if query.query_id.0 != self.query_id {
            return Err("Invalid response query id").handle_error();
        }

        let answer = ton_api::Deserializer::new(&mut std::io::Cursor::new(&query.answer.0))
            .read_boxed::<ton::TLObject>()
            .map_err(|_| "Invalid answer body")
            .handle_error()?;

        match answer.downcast::<T::Reply>() {
            Ok(reply) => Ok(Some(reply)),
            Err(error) => match error.downcast::<ton::lite_server::Error>() {
                Ok(error) => Err(format!(
                    "Query error. Core: {}. Reason: {}",
                    *error.code(),
                    error.message()
                ))
                .handle_error(),
                Err(_) => Err("Unknown query error").handle_error(),
            },
        }
    }
}

impl<T, E> HandleError for Result<T, E>
where
    E: ToString,
{
    type Output = T;

    fn handle_error(self) -> Result<Self::Output, JsValue> {
        self.map_err(|e| js_sys::Error::new(&e.to_string()).into())
    }
}

trait HandleError {
    type Output;

    fn handle_error(self) -> Result<Self::Output, JsValue>;
}
