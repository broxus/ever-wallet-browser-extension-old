use wasm_bindgen::prelude::*;
use js_sys::Uint8Array;

pub mod adnl;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct AdnlConnection {
    state: adnl::ClientState,
    init_packet: Vec<u8>,
}

#[wasm_bindgen]
impl AdnlConnection {
    #[wasm_bindgen(js_name = "fromKey")]
    pub fn from_key(key: &str) -> Result<AdnlConnection, JsValue> {
        let key = base64::decode(key).map_err(|_| "Invalid key").handle_error()?;
        let key = if key.len() == 32 {
            // SAFETY: key length is always 32
            adnl::ExternalKey::from_public_key(unsafe { &*(key.as_ptr() as *const [u8; 32]) })
        } else {
            return Err("Invalid key").handle_error();
        };

        let (state, init_packet) = adnl::ClientState::init(&key);
        Ok((Self { state, init_packet }))
    }

    #[wasm_bindgen(getter, js_name = "initPacket")]
    pub fn init_packet(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.init_packet.as_mut_ptr(), self.init_packet.len()) }
    }
}

#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    console_error_panic_hook::set_once();
    Ok(())
}

pub type Result<T, E = &'static str> = core::result::Result<T, E>;

impl<T> HandleError for Result<T> {
    type Output = T;

    fn handle_error(self) -> Result<Self::Output, JsValue> {
        self.map_err(|e| js_sys::Error::new(&e.to_string()).into())
    }
}

trait HandleError {
    type Output;

    fn handle_error(self) -> Result<Self::Output, JsValue>;
}
