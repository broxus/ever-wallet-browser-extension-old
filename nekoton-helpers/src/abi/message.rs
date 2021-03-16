use anyhow::Error;
use ton_block::messages::Message;
use ton_block::Deserializable;

pub struct MessageState {
    pub message: Message,
}

impl MessageState {
    pub fn new(data: &[u8]) -> Result<Self, Error> {
        let message = Message::construct_from_bytes(data).map_err(|e| Error::msg(e.to_string()))?;
        Ok(Self { message })
    }
}
