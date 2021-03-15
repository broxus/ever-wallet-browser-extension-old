use js_sys::Function;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;

#[wasm_bindgen]
pub struct StorageImpl {
    #[wasm_bindgen(skip)]
    pub get_callback: Function,
    #[wasm_bindgen(skip)]
    pub set_callback: Function,
}

#[wasm_bindgen]
impl StorageImpl {
    #[wasm_bindgen]
    pub fn new(get_callback: Function, set_callback: Function) -> StorageImpl {
        StorageImpl {
            get_callback,
            set_callback,
        }
    }

    #[wasm_bindgen]
    pub fn get_key(&self, key: &str) -> Result<String, JsValue> {
        let this = JsValue::NULL;
        let res: String = self.get_callback.call1(&this, key)?;
        Ok(res)
    }

    #[wasm_bindgen]
    pub fn set_key(&self, key: &str, value: &str) -> Result<bool, JsValue> {
        let this = JsValue::NULL;
        let res = self.set_callback.cal2(&this, key, value)?;
        Ok(res)
    }
}
