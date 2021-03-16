use anyhow::Error;
use ton_block::Deserializable;
pub use ton_block::{CurrencyCollection, Message, Transaction};
pub use ton_types::{AccountId, UInt256};

///Wrapper around [`Transaction`]
pub struct TransactionState {
    tx: Transaction,
}

impl TransactionState {
    pub fn new(data: &[u8]) -> Result<Self, Error> {
        let tx = Transaction::construct_from_bytes(data).map_err(|e| Error::msg(e.to_string()))?;
        Ok(Self { tx })
    }
    /// Get account address of transaction
    pub fn account_id(&self) -> &AccountId {
        self.tx.account_id()
    }

    ///get hash of previous transaction
    pub fn prev_trans_hash(&self) -> UInt256 {
        self.tx.prev_trans_hash
    }

    /// get logical time of previous transaction
    pub fn prev_trans_lt(&self) -> u64 {
        self.tx.prev_trans_lt
    }
    /// get total fees
    pub fn total_fees(&self) -> &CurrencyCollection {
        self.tx.total_fees()
    }
    /// get output message by index
    pub fn get_out_msg(&self, index: i16) -> Result<Option<Message>, Error> {
        self.tx
            .get_out_msg(index)
            .map_err(|e| Error::msg(e.to_string()))
    }

    pub fn gas_used(&self) -> Option<u64> {
        self.tx.gas_used()
    }

    pub fn msg_count(&self) -> i16 {
        self.tx.msg_count()
    }
    /// return now time
    pub fn now(&self) -> u32 {
        self.tx.now()
    }
}
