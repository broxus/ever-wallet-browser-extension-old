use js_sys::Function;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

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
        let res: JsValue = self.get_callback.call1(&this, &JsValue::from_str(key))?;
        res.as_string()
            .ok_or_else(|| JsValue::from_str("Bad callback return type"))
    }

    #[wasm_bindgen]
    pub fn set_key(&self, key: &str, value: &str) -> Result<bool, JsValue> {
        let this = JsValue::NULL;
        let res: JsValue =
            self.set_callback
                .call2(&this, &JsValue::from_str(key), &JsValue::from_str(value))?;
        res.as_bool()
            .ok_or_else(|| JsValue::from_str("Bad callback return type"))
    }
}
