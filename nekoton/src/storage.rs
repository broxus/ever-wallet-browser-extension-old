use js_sys::Function;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct StorageImpl {
    #[wasm_bindgen(skip)]
    pub get_callback: Function,
    #[wasm_bindgen(skip)]
    pub set_callback: Function,
    #[wasm_bindgen(skip)]
    pub js_self: JsValue,
}

#[wasm_bindgen]
impl StorageImpl {
    #[wasm_bindgen(constructor)]
    pub fn new(get_callback: Function, set_callback: Function, js_self: JsValue) -> StorageImpl {
        StorageImpl {
            get_callback,
            set_callback,
            js_self
        }
    }

    pub fn get_key(&self, key: &str) -> Result<String, JsValue> {
        let res: JsValue = self.get_callback.call1(&self.js_self, &JsValue::from_str(key))?;
        res.as_string()
            .ok_or_else(|| JsValue::from_str("Bad callback return type"))
    }


    pub fn set_key(&self, key: &str, value: &str) -> Result<(), JsValue> {
        let res: JsValue =
            self.set_callback
                .call2(&self.js_self, &JsValue::from_str(key), &JsValue::from_str(value))?;
        Ok(())
    }
    #[wasm_bindgen]
    pub fn test(&self) -> String {
        self.set_key("lol", "kek").unwrap();
        self.get_key("lol").unwrap()
    }
}
