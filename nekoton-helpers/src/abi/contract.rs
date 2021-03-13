use anyhow::{Error, Result};
use std::collections::HashMap;

use ton_abi::{Contract, DecodedMessage, Token, TokenValue};
use ton_types::{BuilderData, SliceData};

pub struct ContractState {
    contract: Contract,
}

impl ContractState {
    pub fn new(abi: &str) -> Result<Self> {
        let rdr = std::io::Cursor::new(&abi);
        Ok(Self {
            contract: Contract::load(rdr).map_err(|e| Error::msg(e.to_string()))?,
        })
    }
    ///prepares function call for singing
    /// # Returns
    /// Builder data and hash
    pub fn prepare_function_call_for_signing(
        &self,
        name: &str,
        header: &HashMap<String, TokenValue>,
        input: &[Token],
        internal: bool,
        reserve_sign: bool,
    ) -> Result<(BuilderData, Vec<u8>)> {
        let fun = self
            .contract
            .function(name)
            .map_err(|e| Error::msg(e.to_string()))?;
        let res = fun
            .create_unsigned_call(&header, input, internal, reserve_sign)
            .map_err(|e| Error::msg(e.to_string()))?;
        Ok(res)
    }

    pub fn decode_function_output(
        &self,
        data: &[u8],
        internal: bool,
    ) -> Result<ton_abi::contract::DecodedMessage> {
        self.contract
            .decode_output(SliceData::from(data), internal)
            .map_err(|e| Error::msg(e.to_string()))
    }

    pub fn decode_function_input(
        &self,
        data: &[u8],
        internal: bool,
    ) -> Result<ton_abi::contract::DecodedMessage> {
        self.contract
            .decode_input(data.into(), internal)
            .map_err(|e| Error::msg(e.to_string()))
    }
}
