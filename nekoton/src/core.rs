use std::sync::Arc;

use anyhow::{anyhow, Result};
use async_trait::async_trait;
use ton_api::ton;
use ton_block::{Deserializable, MsgAddressInt};

pub struct TonInterface {
    transport: Box<dyn TonTransport>,
}

impl TonInterface {
    pub fn new(transport: Box<dyn TonTransport>) -> Self {
        Self { transport }
    }

    pub async fn get_masterchain_info(&self) -> Result<LastBlockIdExt> {
        self.transport.get_masterchain_info().await
    }
}

#[async_trait]
pub trait TonTransport: Send + Sync {
    async fn send_message(&self, data: &[u8]) -> Result<()>;
    async fn get_masterchain_info(&self) -> Result<LastBlockIdExt>;
    async fn get_account_state(
        &self,
        last_block_id: &LastBlockIdExt,
        address: &ton_block::MsgAddressInt,
    ) -> Result<AccountState>;
    async fn get_transactions(
        &self,
        address: &MsgAddressInt,
        from: &TransactionId,
        count: u8,
    ) -> Result<Vec<Transaction>>;
}

pub struct AdnlTransport {
    connection: Arc<dyn AdnlConnection>,
}

impl AdnlTransport {
    pub fn new(connection: Arc<dyn AdnlConnection>) -> Self {
        Self { connection }
    }

    async fn query<T>(&self, query: T) -> Result<T::Reply>
    where
        T: ton_api::Function,
    {
        let response = self.connection.query(ton::TLObject::new(query)).await?;
        match response.downcast::<T::Reply>() {
            Ok(reply) => Ok(reply),
            Err(error) => match error.downcast::<ton::lite_server::Error>() {
                Ok(error) => Err(anyhow!(
                    "Query error. Core: {}. Reason: {}",
                    *error.code(),
                    error.message()
                )),
                Err(_) => Err(anyhow!("Unknown query error")),
            },
        }
    }
}

#[async_trait]
impl TonTransport for AdnlTransport {
    async fn send_message(&self, data: &[u8]) -> Result<()> {
        self.query(ton::rpc::lite_server::SendMessage {
            body: ton::bytes(data.to_vec()),
        })
        .await?;
        Ok(())
    }

    async fn get_masterchain_info(&self) -> Result<LastBlockIdExt> {
        let info = self
            .query(ton::rpc::lite_server::GetMasterchainInfo)
            .await?;

        Ok(LastBlockIdExt {
            workchain: info.last().workchain as i8,
            shard: info.last().shard as u64,
            seqno: info.last().seqno as u32,
            root_hash: info.last().root_hash.0,
            file_hash: info.last().file_hash.0,
        })
    }

    async fn get_account_state(
        &self,
        last_block_id: &LastBlockIdExt,
        address: &MsgAddressInt,
    ) -> Result<AccountState> {
        use ton_block::{Deserializable, HashmapAugType};

        let response = self
            .query(ton::rpc::lite_server::GetAccountState {
                id: ton::ton_node::blockidext::BlockIdExt {
                    workchain: last_block_id.workchain as ton::int,
                    shard: last_block_id.shard as ton::int64,
                    seqno: last_block_id.seqno as ton::int,
                    root_hash: ton::int256(last_block_id.root_hash),
                    file_hash: ton::int256(last_block_id.file_hash),
                },
                account: ton::lite_server::accountid::AccountId {
                    workchain: address.workchain_id(),
                    id: ton::int256(
                        ton_types::UInt256::from(address.address().get_bytestring(0)).into(),
                    ),
                },
            })
            .await?
            .only();

        match ton_block::Account::construct_from_bytes(&response.state.0) {
            Ok(ton_block::Account::Account(info)) => {
                let q_roots =
                    ton_types::deserialize_cells_tree(&mut std::io::Cursor::new(&response.proof.0))
                        .map_err(|_| QueryAccountStateError::InvalidAccountStateProof)?;
                if q_roots.len() != 2 {
                    return Err(QueryAccountStateError::InvalidAccountStateProof.into());
                }

                let merkle_proof = ton_block::MerkleProof::construct_from_cell(q_roots[0].clone())
                    .map_err(|_| QueryAccountStateError::InvalidAccountStateProof)?;
                let proof_root = merkle_proof.proof.virtualize(1);

                let ss = ton_block::ShardStateUnsplit::construct_from(&mut proof_root.into())
                    .map_err(|_| QueryAccountStateError::InvalidAccountStateProof)?;

                let shard_info = ss
                    .read_accounts()
                    .and_then(|accounts| {
                        accounts.get(&ton_types::UInt256::from(
                            address.get_address().get_bytestring(0),
                        ))
                    })
                    .map_err(|_| QueryAccountStateError::InvalidAccountStateProof)?;

                Ok(if let Some(shard_info) = shard_info {
                    AccountState::Active(ActiveAccountState {
                        last_trans_id: TransactionId {
                            lt: shard_info.last_trans_lt(),
                            hash: shard_info.last_trans_hash().clone().into(),
                        },
                        gen_lt: ss.gen_lt(),
                        gen_utime: ss.gen_time(),
                        balance: info.storage.balance.grams.0 as u64,
                    })
                } else {
                    AccountState::NotFound
                })
            }
            Ok(_) => Ok(AccountState::NotFound),
            Err(_) => Err(QueryAccountStateError::InvalidAccountState.into()),
        }
    }

    async fn get_transactions(
        &self,
        address: &MsgAddressInt,
        from: &TransactionId,
        count: u8,
    ) -> Result<Vec<Transaction>> {
        let response = self
            .query(ton::rpc::lite_server::GetTransactions {
                count: count as i32,
                account: ton::lite_server::accountid::AccountId {
                    workchain: address.workchain_id() as i32,
                    id: ton::int256(
                        ton_types::UInt256::from(address.address().get_bytestring(0)).into(),
                    ),
                },
                lt: from.lt as i64,
                hash: ton::int256(from.hash),
            })
            .await?;
        let transactions = ton_types::deserialize_cells_tree(&mut std::io::Cursor::new(
            &response.transactions().0,
        ))
        .map_err(|_| QueryTransactionsError::InvalidTransactionsList)?;

        let mut result = Vec::with_capacity(transactions.len());
        for item in transactions.into_iter() {
            let hash = item.repr_hash();
            let transaction = ton_block::Transaction::construct_from_cell(item)
                .map_err(|_| QueryTransactionsError::InvalidTransaction)?;
            result.push(Transaction {
                id: TransactionId {
                    lt: transaction.lt,
                    hash: hash.into(),
                },
                prev_trans_lt: (transaction.prev_trans_lt != 0).then(|| TransactionId {
                    lt: transaction.prev_trans_lt,
                    hash: transaction.prev_trans_hash.into(),
                }),
                now: transaction.now,
            });
        }
        Ok(result)
    }
}

#[derive(thiserror::Error, Debug)]
pub enum QueryAccountStateError {
    #[error("Invalid account state")]
    InvalidAccountState,
    #[error("Invalid account state proof")]
    InvalidAccountStateProof,
}

#[derive(thiserror::Error, Debug)]
pub enum QueryTransactionsError {
    #[error("Invalid transactions list")]
    InvalidTransactionsList,
    #[error("Invalid transaction data")]
    InvalidTransaction,
}

#[async_trait]
pub trait AdnlConnection: Send + Sync {
    async fn query(&self, request: ton::TLObject) -> Result<ton::TLObject>;
}

#[derive(Debug, Clone)]
pub struct LastBlockIdExt {
    pub workchain: i8,
    pub shard: u64,
    pub seqno: u32,
    pub root_hash: [u8; 32],
    pub file_hash: [u8; 32],
}

#[derive(Debug, Clone)]
pub enum AccountState {
    NotFound,
    Frozen,
    Active(ActiveAccountState),
}

#[derive(Debug, Clone)]
pub struct ActiveAccountState {
    pub last_trans_id: TransactionId,
    pub gen_lt: u64,
    pub gen_utime: u32,
    pub balance: u64,
}

#[derive(Debug, Clone)]
pub struct TransactionId {
    pub lt: u64,
    pub hash: [u8; 32],
}

#[derive(Debug, Clone)]
pub struct Transaction {
    pub id: TransactionId,
    pub prev_trans_lt: Option<TransactionId>,
    pub now: u32,
}
