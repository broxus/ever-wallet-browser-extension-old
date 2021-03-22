use anyhow::Error;
use js_sys::Function;
use libnekoton::storage::KvStorage;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

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
            js_self,
        }
    }

    pub fn get_key(&self, key: &str) -> Result<Option<String>, JsValue> {
        let res: JsValue = self
            .get_callback
            .call1(&self.js_self, &JsValue::from_str(key))?;
        Ok(res.as_string())
    }

    pub fn set_key(&self, key: &str, value: &str) -> Result<(), JsValue> {
        self.set_callback.call2(
            &self.js_self,
            &JsValue::from_str(key),
            &JsValue::from_str(value),
        )?;
        Ok(())
    }
}

impl KvStorage for StorageImpl {
    fn get(&self, key: &str) -> Result<Option<String>, Error> {
        self.get_key(key)
            .map_err(|x| anyhow::Error::msg(x.as_string().expect("It's string, yep?")))
    }

    fn set(&self, key: &str, value: &str) -> Result<(), Error> {
        self.set_key(key, value)
            .map_err(|x| anyhow::Error::msg(x.as_string().expect("It's string, yep?")))
    }
}
