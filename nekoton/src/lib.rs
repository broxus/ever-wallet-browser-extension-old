#![allow(clippy::enum_variant_names)]
#![allow(clippy::too_many_arguments)]

pub mod core;
pub mod crypto;
pub mod external;
pub mod helpers;
pub mod transport;
pub mod utils;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    #[cfg(debug_assertions)]
    console_error_panic_hook::set_once();
    wasm_logger::init(wasm_logger::Config::default());

    Ok(())
}
