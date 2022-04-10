use std::sync::Arc;

use wasm_bindgen::prelude::*;

use crate::external::{JrpcConnector, JrpcSender};
use crate::utils::*;

#[wasm_bindgen]
pub struct JrpcConnection {
    #[wasm_bindgen(skip)]
    pub inner: Arc<JrpcConnector>,
    #[wasm_bindgen(skip)]
    pub clock: Arc<nt_utils::ClockWithOffset>,
}

#[wasm_bindgen]
impl JrpcConnection {
    #[wasm_bindgen(constructor)]
    pub fn new(clock: &ClockWithOffset, sender: JrpcSender) -> Self {
        Self {
            inner: Arc::new(JrpcConnector::new(sender)),
            clock: clock.clone_inner(),
        }
    }
}
