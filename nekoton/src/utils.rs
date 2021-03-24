use anyhow::Error;
use futures::channel::oneshot;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

pub trait TrustMe<T>: Sized {
    #[track_caller]
    fn trust_me(self) -> T;
}

impl<T, E> TrustMe<T> for Result<T, E>
where
    E: std::fmt::Debug,
{
    #[track_caller]
    fn trust_me(self) -> T {
        self.expect("Shouldn't fail")
    }
}

impl<T> TrustMe<T> for Option<T> {
    #[track_caller]
    fn trust_me(self) -> T {
        self.expect("Shouldn't fail")
    }
}

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
        self.map_err(|e| js_sys::Error::new(&e.to_string()).into())
    }
}

pub trait HandleError {
    type Output;

    fn handle_error(self) -> Result<Self::Output, JsValue>;
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<void>")]
    pub type PromiseVoid;

    #[wasm_bindgen(typescript_type = "Promise<string>")]
    pub type PromiseString;
}
