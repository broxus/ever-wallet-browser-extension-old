use std::sync::Arc;

use wasm_bindgen::prelude::*;

use nt::transport::adnl;

use crate::external::{AdnlConnectionImpl, TcpReceiver, TcpSender};
use crate::utils::*;

#[wasm_bindgen]
pub struct AdnlConnection {
    #[wasm_bindgen(skip)]
    pub inner: Arc<AdnlConnectionImpl>,
}

#[wasm_bindgen]
impl AdnlConnection {
    #[wasm_bindgen(constructor)]
    pub fn new(tx: TcpSender) -> AdnlConnection {
        Self {
            inner: Arc::new(AdnlConnectionImpl::new(tx)),
        }
    }

    #[wasm_bindgen(js_name = "init")]
    pub fn init(&self, key: &str) -> Result<TcpReceiver, JsValue> {
        self.inner.clone().init(key).handle_error()
    }
}

impl AdnlConnection {
    pub fn make_transport(&self) -> adnl::AdnlTransport {
        adnl::AdnlTransport::new(self.inner.clone())
    }
}
