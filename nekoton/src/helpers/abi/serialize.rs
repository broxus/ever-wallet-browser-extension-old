use anyhow::Result;
use serde;
use serde::de::Error;
use serde::{Deserialize, Deserializer};
use ton_abi::{Param, ParamType};
use ton_types::serialize_toc;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

use crate::helpers::abi::{parse_tokens_object, AbiError, TokensObject};
use crate::utils::*;

#[derive(Debug, Clone, PartialEq, Deserialize)]
struct SerdeParam {
    /// Param name.
    pub name: String,
    /// Param type.
    #[serde(rename = "type")]
    pub kind: ParamTypeDef,
    /// Tuple components
    #[serde(default)]
    pub components: Vec<ParamWrapper>,
}

impl<'a> Deserialize<'a> for ParamWrapper {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'a>,
    {
        fn set_components(ptype: &mut ParamTypeDef, components: Vec<ParamWrapper>) -> Result<()> {
            match ptype {
                ParamTypeDef::Tuple(params) => {
                    if components.len() == 0 {
                        anyhow::bail!(AbiError::EmptyComponents)
                    } else {
                        Ok(*params = components)
                    }
                }
                ParamTypeDef::Array(array_type) => set_components(array_type, components),
                ParamTypeDef::FixedArray(array_type, _) => set_components(array_type, components),
                ParamTypeDef::Map(_, value_type) => set_components(value_type, components),
                _ => {
                    if components.len() != 0 {
                        anyhow::bail!(AbiError::UnusedComponents)
                    } else {
                        Ok(())
                    }
                }
            }
        }

        // A little trick: tuple parameters is described in JSON as addition field `components`
        // but struct `Param` doesn't have such a field and tuple components is stored inside of
        // `ParamType::Tuple` enum. To use automated deserialization instead of manual parameters
        // recognizing we first deserialize parameter into temp struct `SerdeParam` and then
        // if parameter is a tuple repack tuple components from `SerdeParam::components`
        // into `ParamType::Tuple`
        let value = serde_json::Value::deserialize(deserializer)?;
        if value.is_string() {
            let type_str = value.as_str().unwrap();
            let param_type: ParamTypeDef =
                serde_json::from_value(value.clone()).map_err(|err| D::Error::custom(err))?;
            match param_type {
                ParamTypeDef::Tuple(_) |
                ParamTypeDef::Array(_) |
                ParamTypeDef::FixedArray(_, _) |
                ParamTypeDef::Map(_, _) =>
                    return Err(D::Error::custom(
                        format!("Invalid parameter specification: {}. Only simple types can be represented as strings",
                                type_str))),
                _ => {}
            }
            Ok(Self {
                name: type_str.to_owned(),
                kind: param_type,
            })
        } else {
            let serde_param: SerdeParam =
                serde_json::from_value(value).map_err(|err| D::Error::custom(err))?;

            let mut result = Self {
                name: serde_param.name,
                kind: serde_param.kind,
            };

            set_components(&mut result.kind, serde_param.components).map_err(D::Error::custom)?;

            Ok(result)
        }
    }
}

fn unbox<T>(value: Box<T>) -> T {
    *value
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ParamWrapper {
    // Param name.
    pub name: String,
    // Param type.
    pub kind: ParamTypeDef,
}

impl From<ParamWrapper> for Param {
    fn from(a: ParamWrapper) -> Self {
        let kind: ParamType = a.kind.into();
        Param { name: a.name, kind }
    }
}

impl From<ParamTypeDef> for ParamType {
    fn from(a: ParamTypeDef) -> Self {
        match a {
            ParamTypeDef::Unknown => ParamType::Unknown,
            ParamTypeDef::Uint(a) => ParamType::Uint(a),
            ParamTypeDef::Int(a) => ParamType::Int(a),
            ParamTypeDef::Bool => ParamType::Bool,
            ParamTypeDef::Tuple(a) => ParamType::Tuple(
                a.into_iter()
                    .map(|x| {
                        let kind: ParamType = x.kind.into();
                        Param { name: x.name, kind }
                    })
                    .collect(),
            ),
            ParamTypeDef::Array(a) => ParamType::Array(Box::new(unbox(a).into())),
            ParamTypeDef::FixedArray(a, b) => ParamType::FixedArray(Box::new(unbox(a).into()), b),
            ParamTypeDef::Cell => ParamType::Cell,
            ParamTypeDef::Map(a, b) => {
                ParamType::Map(Box::new(unbox(a).into()), Box::new(unbox(b).into()))
            }
            ParamTypeDef::Address => ParamType::Address,
            ParamTypeDef::Bytes => ParamType::Bytes,
            ParamTypeDef::FixedBytes(a) => ParamType::FixedBytes(a),
            ParamTypeDef::Gram => ParamType::Gram,
            ParamTypeDef::Time => ParamType::Time,
            ParamTypeDef::Expire => ParamType::Expire,
            ParamTypeDef::PublicKey => ParamType::PublicKey,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
enum ParamTypeDef {
    Unknown,
    /// uint<M>: unsigned integer type of M bits.
    Uint(usize),
    /// int<M>: signed integer type of M bits.
    Int(usize),
    /// bool: boolean value.
    Bool,
    /// Tuple: several values combined into tuple.
    Tuple(Vec<ParamWrapper>),
    /// T[]: dynamic array of elements of the type T.
    Array(Box<ParamTypeDef>),
    /// T[k]: dynamic array of elements of the type T.
    FixedArray(Box<ParamTypeDef>, usize),
    /// cell - tree of cells
    Cell,
    /// hashmap - values dictionary
    Map(Box<ParamTypeDef>, Box<ParamTypeDef>),
    /// TON message address
    Address,
    /// byte array
    Bytes,
    /// fixed size byte array
    FixedBytes(usize),
    /// Nanograms
    Gram,
    /// Timestamp
    Time,
    /// Message expiration time
    Expire,
    /// Public key
    PublicKey,
}

#[wasm_bindgen(js_name = "packIntoCell")]
pub fn pack_into_cell(abi: TokensObject, params: JsValue) -> Result<String, JsValue> {
    let params = params
        .into_serde::<Vec<ParamWrapper>>()
        .map(|x| x.into_iter().map(|x| x.into()).collect::<Vec<Param>>())
        .handle_error()?;

    let abi = parse_tokens_object(&params, abi).handle_error()?;
    nt::helpers::abi::pack_into_cell(&abi)
        .map(|x| serialize_toc(&x))
        .map_err(|e| {
            AbiError::FailedtoPackIntoCell(format!(
                "Failed serializing into toc: {}",
                e.to_string()
            ))
        })
        .handle_error()?
        .map(|x| base64::encode(x))
        .map_err(|e| AbiError::FailedtoPackIntoCell(e.to_string()))
        .handle_error()
}
