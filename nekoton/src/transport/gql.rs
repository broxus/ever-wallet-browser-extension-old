use std::sync::Arc;

use anyhow::Result;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::*;

use nt::transport::gql;

use crate::external::{GqlConnectionImpl, GqlSender};
use crate::utils::*;

#[wasm_bindgen]
pub struct GqlConnection {
    #[wasm_bindgen(skip)]
    pub inner: Arc<GqlConnectionImpl>,
    #[wasm_bindgen(skip)]
    pub clock: Arc<nt_utils::ClockWithOffset>,
}

#[wasm_bindgen]
impl GqlConnection {
    #[wasm_bindgen(constructor)]
    pub fn new(clock: &ClockWithOffset, sender: GqlSender) -> GqlConnection {
        Self {
            inner: Arc::new(GqlConnectionImpl::new(sender)),
            clock: clock.clone_inner(),
        }
    }

    #[wasm_bindgen(js_name = "getLatestBlock")]
    pub fn get_latest_block(&self, address: &str) -> Result<PromiseLatestBlock, JsValue> {
        let address = parse_address(address)?;
        let transport = self.make_transport();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let latest_block = transport.get_latest_block(&address).await.handle_error()?;
            Ok(make_latest_block(latest_block))
        })))
    }

    #[wasm_bindgen(js_name = "waitForNextBlock")]
    pub fn wait_for_next_block(
        &self,
        current_block_id: String,
        address: &str,
        timeout: u32,
    ) -> Result<PromiseString, JsValue> {
        let address = parse_address(address)?;
        let transport = self.make_transport();

        Ok(JsCast::unchecked_into(future_to_promise(async move {
            let next_block = transport
                .wait_for_next_block(
                    &current_block_id,
                    &address,
                    std::time::Duration::from_secs(timeout as u64),
                )
                .await
                .handle_error()?;
            Ok(JsValue::from(next_block))
        })))
    }
}

impl GqlConnection {
    fn make_transport(&self) -> gql::GqlTransport {
        gql::GqlTransport::new(self.inner.clone())
    }
}

#[wasm_bindgen(typescript_custom_section)]
const LATEST_BLOCK: &'static str = r#"
export type LatestBlock = {
    id: string,
    endLt: string,
    genUtime: number,
};
"#;

fn make_latest_block(latest_block: nt::transport::gql::LatestBlock) -> JsValue {
    ObjectBuilder::new()
        .set("id", latest_block.id)
        .set("endLt", latest_block.end_lt.to_string())
        .set("genUtime", latest_block.gen_utime)
        .build()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Promise<LatestBlock>")]
    pub type PromiseLatestBlock;
}
