mod core;
pub mod crypto;
mod helpers;
mod storage;
mod transport;
mod utils;

use std::sync::Arc;

use libnekoton::transport::adnl;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::future_to_promise;

use crate::transport::adnl::AdnlConnection;
use crate::transport::gql::GqlConnection;
use crate::utils::*;

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
pub struct TonInterface {
    #[wasm_bindgen(skip)]
    pub inner: Arc<libnekoton::core::TonInterface>,
}

impl TonInterface {
    fn new(transport: Box<dyn libnekoton::transport::Transport>) -> Self {
        TonInterface {
            inner: Arc::new(libnekoton::core::TonInterface::new(transport)),
        }
    }
}

#[wasm_bindgen]
impl TonInterface {
    #[wasm_bindgen(js_name = "overAdnl")]
    pub fn over_adnl(connection: AdnlConnection) -> TonInterface {
        TonInterface::new(Box::new(adnl::AdnlTransport::new(Arc::new(connection))))
    }

    #[wasm_bindgen(js_name = "overGraphQL")]
    pub fn over_gql(connection: &GqlConnection) -> TonInterface {
        TonInterface::new(Box::new(connection.make_transport()))
    }
}
