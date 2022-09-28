use std::str::FromStr;

use gloo_utils::format::JsValueSerdeExt;
use serde::Deserialize;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use crate::utils::*;

pub mod accounts_storage;
pub mod generic_contract;
pub mod keystore;
pub mod models;
pub mod token_wallet;
pub mod ton_wallet;

#[wasm_bindgen(typescript_custom_section)]
pub const INTERNAL_MESSAGE: &str = r#"
export type InternalMessage = {
    source?: string,
    destination: string,
    amount: string,
    bounce: boolean,
    body: string,
};
"#;

pub fn make_internal_message(data: nt::core::InternalMessage) -> Result<InternalMessage, JsValue> {
    Ok(ObjectBuilder::new()
        .set("source", data.source.as_ref().map(ToString::to_string))
        .set("destination", data.destination.to_string())
        .set("amount", data.amount.to_string())
        .set("bounce", data.bounce)
        .set("body", {
            let cell = data.body.into_cell();
            base64::encode(&ton_types::serialize_toc(&cell).handle_error()?)
        })
        .build()
        .unchecked_into())
}

pub fn parse_internal_message(data: InternalMessage) -> Result<nt::core::InternalMessage, JsValue> {
    #[derive(Deserialize)]
    struct ParsedInternalMessage {
        source: Option<String>,
        destination: String,
        amount: String,
        bounce: bool,
        body: String,
    }

    let data = JsValue::into_serde::<ParsedInternalMessage>(&data).handle_error()?;

    Ok(nt::core::InternalMessage {
        source: data.source.as_deref().map(parse_address).transpose()?,
        destination: parse_address(&data.destination)?,
        amount: u64::from_str(&data.amount).handle_error()?,
        bounce: data.bounce,
        body: parse_slice(&data.body)?,
    })
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "InternalMessage")]
    pub type InternalMessage;
}
