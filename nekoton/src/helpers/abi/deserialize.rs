use super::serialize::ParamWrapper;
use super::TokensObject;
use crate::utils::HandleError;
use ton_abi::Param;
use ton_types::{deserialize_cells_tree, BuilderData, SliceData};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

#[wasm_bindgen(js_name = "unpackCell")]
pub fn unpack_from_cell(
    params: JsValue,
    cell_data: &str,
    partial_unpack: bool,
) -> Result<TokensObject, JsValue> {
    let data = base64::decode(cell_data).handle_error()?;
    let params = params
        .into_serde::<Vec<ParamWrapper>>()
        .map(|x| x.into_iter().map(|x| x.into()).collect::<Vec<Param>>())
        .handle_error()?;

    let cell = deserialize_cells_tree(&mut std::io::Cursor::new(data))
        .handle_error()?
        .into_iter()
        .map(BuilderData::from)
        .fold(BuilderData::new(), |mut acc, x| {
            acc.append_reference(x);
            acc
        });
    let slice = SliceData::from(cell);
    nt::helpers::abi::unpack_from_cell(params.as_slice(), slice, partial_unpack)
        .handle_error()
        .and_then(|x| super::make_tokens_object(&x))
}
