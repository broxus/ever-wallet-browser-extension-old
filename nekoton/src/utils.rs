use std::str::FromStr;
use std::sync::{Arc, Mutex};

use anyhow::Error;
use futures::channel::oneshot;
use ton_block::{Deserializable, MsgAddressInt};
use wasm_bindgen::prelude::*;
use wasm_bindgen::{JsCast, JsValue};

use nt_utils::TrustMe;

pub struct QueryHandler<T> {
    tx: oneshot::Sender<T>,
}

impl<T> QueryHandler<T> {
    pub fn new(tx: oneshot::Sender<T>) -> Self {
        Self { tx }
    }

    pub fn send(self, value: T) {
        let _ = self.tx.send(value);
    }
}

pub type QueryResultHandler<T> = QueryHandler<Result<T, Error>>;

impl<T, E> HandleError for Result<T, E>
where
    E: ToString,
{
    type Output = T;

    fn handle_error(self) -> Result<Self::Output, JsValue> {
        self.map_err(|e| {
            let error = e.to_string();
            js_sys::Error::new(&error).unchecked_into()
        })
    }
}

pub trait HandleError {
    type Output;

    fn handle_error(self) -> Result<Self::Output, JsValue>;
}

pub struct ObjectBuilder {
    object: js_sys::Object,
}

impl ObjectBuilder {
    pub fn new() -> Self {
        Self {
            object: js_sys::Object::new(),
        }
    }

    pub fn set<T>(self, key: &str, value: T) -> Self
    where
        JsValue: From<T>,
    {
        let key = JsValue::from_str(key);
        let value = JsValue::from(value);
        js_sys::Reflect::set(&self.object, &key, &value).trust_me();
        self
    }

    pub fn build(self) -> JsValue {
        JsValue::from(self.object)
    }
}

impl Default for ObjectBuilder {
    fn default() -> Self {
        Self::new()
    }
}

pub fn parse_public_key(public_key: &str) -> Result<ed25519_dalek::PublicKey, JsValue> {
    ed25519_dalek::PublicKey::from_bytes(&hex::decode(&public_key).handle_error()?).handle_error()
}

pub fn parse_address(address: &str) -> Result<MsgAddressInt, JsValue> {
    MsgAddressInt::from_str(address).handle_error()
}

pub fn parse_slice(boc: &str) -> Result<ton_types::SliceData, JsValue> {
    let body = base64::decode(boc).handle_error()?;
    let cell =
        ton_types::deserialize_tree_of_cells(&mut std::io::Cursor::new(&body)).handle_error()?;
    Ok(cell.into())
}

pub fn parse_account_stuff(boc: &str) -> Result<ton_block::AccountStuff, JsValue> {
    ton_block::AccountStuff::construct_from_base64(boc).handle_error()
}

#[wasm_bindgen]
pub struct ClockWithOffset {
    #[wasm_bindgen(skip)]
    pub inner: Arc<Mutex<nt_utils::ClockWithOffset>>,
}

#[wasm_bindgen]
impl ClockWithOffset {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ClockWithOffset {
        Self {
            inner: Arc::new(Mutex::new(Default::default())),
        }
    }

    #[wasm_bindgen(js_name = "updateOffset")]
    pub fn update_offset(&self, offset_ms: f64) {
        self.inner.lock().trust_me().update_offset(offset_ms as u64)
    }

    #[wasm_bindgen(js_name = "offsetMs")]
    pub fn offset_ms(&self) -> f64 {
        self.inner.lock().trust_me().offset_ms() as f64
    }
}

impl ClockWithOffset {
    pub fn as_const(&self) -> nt_utils::ConstClock {
        nt_utils::ConstClock::from_millis(self.inner.lock().trust_me().offset_ms() + 1)
    }
}

#[wasm_bindgen(typescript_custom_section)]
const GENERAL_STUFF: &str = r#"
export type EnumItem<T extends string, D> = { type: T, data: D };
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<void>")]
    pub type PromiseVoid;

    #[wasm_bindgen(typescript_type = "Promise<boolean>")]
    pub type PromiseBool;

    #[wasm_bindgen(typescript_type = "Promise<string>")]
    pub type PromiseString;

    #[wasm_bindgen(typescript_type = "Promise<string | undefined>")]
    pub type PromiseOptionString;

    #[wasm_bindgen(typescript_type = "Array<Transaction>")]
    pub type TransactionsList;

    #[wasm_bindgen(typescript_type = "Array<string>")]
    pub type StringArray;

    #[wasm_bindgen(typescript_type = "Array<string>")]
    pub type CustodiansList;

    #[wasm_bindgen(typescript_type = "Array<MultisigPendingTransaction>")]
    pub type MultisigPendingTransactionList;
}
