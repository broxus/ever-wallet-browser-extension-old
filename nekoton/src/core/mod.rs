pub mod models;
pub mod token_wallet;
pub mod ton_wallet;

use wasm_bindgen::prelude::*;

use crate::utils::*;

#[wasm_bindgen]
pub struct InternalMessage {
    #[wasm_bindgen(skip)]
    pub inner: nt::core::InternalMessage,
}

#[wasm_bindgen]
impl InternalMessage {
    #[wasm_bindgen(getter)]
    pub fn source(&self) -> Option<String> {
        self.inner.source.as_ref().map(ToString::to_string)
    }

    #[wasm_bindgen(getter)]
    pub fn destination(&self) -> String {
        self.inner.destination.to_string()
    }

    #[wasm_bindgen(getter)]
    pub fn amount(&self) -> String {
        self.inner.amount.to_string()
    }

    #[wasm_bindgen(getter)]
    pub fn bounce(&self) -> bool {
        self.inner.bounce
    }

    #[wasm_bindgen(getter)]
    pub fn body(&self) -> Result<String, JsValue> {
        let cell = self.inner.body.into_cell();
        Ok(base64::encode(
            &ton_types::serialize_toc(&cell).handle_error()?,
        ))
    }
}

impl From<nt::core::InternalMessage> for InternalMessage {
    fn from(inner: nt::core::InternalMessage) -> Self {
        Self { inner }
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

pub fn make_latest_block(latest_block: nt::transport::gql::LatestBlock) -> JsValue {
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
