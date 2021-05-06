use std::borrow::Cow;
use std::collections::HashMap;
use std::str::FromStr;

use num_bigint::{BigInt, BigUint};
use ton_block::{Deserializable, GetRepresentationHash, MsgAddressInt, Serializable};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use nt::helpers::abi::FunctionExt;
use nt::utils::*;

use crate::utils::*;

#[wasm_bindgen(js_name = "runLocal")]
pub fn run_local(
    gen_timings: crate::core::models::GenTimings,
    last_transaction_id: crate::core::models::LastTransactionId,
    account_stuff_boc: &str,
    contract_abi: &str,
    method: &str,
    input: TokensObject,
) -> Result<ExecutionOutput, JsValue> {
    use crate::core::models::*;

    let gen_timings = parse_gen_timings(gen_timings)?;
    let last_transaction_id = parse_last_transaction_id(last_transaction_id)?;
    let account_stuff = parse_account_stuff(account_stuff_boc)?;
    let contract_abi = parse_contract_abi(contract_abi)?;
    let method = contract_abi.function(method).handle_error()?;
    let input = parse_tokens_object(&method.inputs, input).handle_error()?;

    let output = method
        .run_local(account_stuff, gen_timings, &last_transaction_id, &input)
        .handle_error()?;

    make_execution_output(&output)
}

#[wasm_bindgen(js_name = "getExpectedAddress")]
pub fn get_expected_address(
    tvc: &str,
    contract_abi: &str,
    workchain_id: i8,
    public_key: Option<String>,
    init_data: TokensObject,
) -> Result<String, JsValue> {
    let mut state_init = ton_block::StateInit::construct_from_base64(tvc).handle_error()?;
    let contract_abi = parse_contract_abi(contract_abi)?;
    let public_key = public_key.as_deref().map(parse_public_key).transpose()?;

    state_init.data = if let Some(data) = state_init.data.take() {
        Some(insert_init_data(&contract_abi, data.into(), &public_key, init_data)?.into_cell())
    } else {
        None
    };

    let hash = state_init.hash().trust_me();

    Ok(MsgAddressInt::AddrStd(ton_block::MsgAddrStd {
        anycast: None,
        workchain_id,
        address: hash.into(),
    })
    .to_string())
}

#[wasm_bindgen(js_name = "encodeInternalInput")]
pub fn encode_internal_input(
    contract_abi: &str,
    method: &str,
    input: TokensObject,
) -> Result<String, JsValue> {
    let contract_abi = parse_contract_abi(contract_abi)?;
    let method = contract_abi.function(method).handle_error()?;
    let input = parse_tokens_object(&method.inputs, input).handle_error()?;

    let body = method
        .encode_input(&Default::default(), &input, true, None)
        .and_then(|value| value.into_cell())
        .handle_error()?;
    let body = ton_types::serialize_toc(&body).handle_error()?;
    Ok(base64::encode(&body))
}

#[wasm_bindgen(js_name = "createExternalMessage")]
pub fn create_external_message(
    dst: &str,
    contract_abi: &str,
    method: &str,
    state_init: Option<String>,
    input: TokensObject,
    public_key: &str,
    timeout: u32,
) -> Result<crate::crypto::UnsignedMessage, JsValue> {
    let dst = parse_address(dst)?;
    let contract_abi = parse_contract_abi(contract_abi)?;
    let method = contract_abi.function(method).handle_error()?;
    let state_init = state_init
        .as_deref()
        .map(ton_block::StateInit::construct_from_base64)
        .transpose()
        .handle_error()?;
    let input = parse_tokens_object(&method.inputs, input).handle_error()?;
    let public_key = parse_public_key(public_key)?;

    let mut message =
        ton_block::Message::with_ext_in_header(ton_block::ExternalInboundMessageHeader {
            dst,
            ..Default::default()
        });
    if let Some(state_init) = state_init {
        message.set_state_init(state_init);
    }

    Ok(crate::crypto::UnsignedMessage {
        inner: nt::core::utils::make_labs_unsigned_message(
            message,
            nt::core::models::Expiration::Timeout(timeout),
            &public_key,
            Cow::Owned(method.clone()),
            input,
        )
        .handle_error()?,
    })
}

#[wasm_bindgen(js_name = "decodeInput")]
pub fn decode_input(
    message_body: &str,
    contract_abi: &str,
    method: JsMethodName,
    internal: bool,
) -> Result<Option<DecodedInput>, JsValue> {
    let message_body = parse_slice(message_body)?;
    let contract_abi = parse_contract_abi(contract_abi)?;
    let method = match guess_method_by_input(&contract_abi, &message_body, method, internal)? {
        Some(method) => method,
        None => return Ok(None),
    };

    let input = method.decode_input(message_body, internal).handle_error()?;
    Ok(Some(
        ObjectBuilder::new()
            .set("method", &method.name)
            .set("input", make_tokens_object(&input)?)
            .build()
            .unchecked_into(),
    ))
}

#[wasm_bindgen(js_name = "decodeOutput")]
pub fn decode_output(
    message_body: &str,
    contract_abi: &str,
    method: JsMethodName,
) -> Result<Option<DecodedOutput>, JsValue> {
    let message_body = parse_slice(message_body)?;
    let contract_abi = parse_contract_abi(contract_abi)?;
    let method = parse_method_name(method)?;

    let method = match method {
        MethodName::Known(name) => contract_abi.function(&name).handle_error()?,
        MethodName::Guess(names) => {
            let output_id = nt::utils::read_u32(&message_body).handle_error()?;

            let mut method = None;
            for name in names.iter() {
                let function = contract_abi.function(name).handle_error()?;
                if function.output_id == output_id {
                    method = Some(function);
                    break;
                }
            }

            match method {
                Some(method) => method,
                None => return Ok(None),
            }
        }
    };

    let output = method.decode_output(message_body, true).handle_error()?;
    Ok(Some(
        ObjectBuilder::new()
            .set("method", &method.name)
            .set("output", make_tokens_object(&output)?)
            .build()
            .unchecked_into(),
    ))
}

#[wasm_bindgen(js_name = "decodeTransaction")]
pub fn decode_transaction(
    transaction: crate::core::models::Transaction,
    contract_abi: &str,
    method: JsMethodName,
) -> Result<Option<DecodedTransaction>, JsValue> {
    let transaction: JsValue = transaction.unchecked_into();
    if !transaction.is_object() {
        return Err(AbiError::ExpectedObject).handle_error();
    }

    let contract_abi = parse_contract_abi(contract_abi)?;

    let in_msg = js_sys::Reflect::get(&transaction, &JsValue::from_str("inMessage"))?;
    if !in_msg.is_object() {
        return Err(AbiError::ExpectedMessage).handle_error();
    }
    let internal = js_sys::Reflect::get(&in_msg, &JsValue::from_str("src"))?.is_string();

    let body_key = JsValue::from_str("body");
    let in_msg_body = match js_sys::Reflect::get(&in_msg, &body_key)?.as_string() {
        Some(body) => parse_slice(&body)?,
        None => return Ok(None),
    };

    let method = match guess_method_by_input(&contract_abi, &in_msg_body, method, internal)? {
        Some(method) => method,
        None => return Ok(None),
    };

    let input = method.decode_input(in_msg_body, internal).handle_error()?;

    let out_msgs = js_sys::Reflect::get(&transaction, &JsValue::from_str("outMessages"))?;
    if !js_sys::Array::is_array(&out_msgs) {
        return Err(AbiError::ExpectedArray).handle_error();
    }

    let dst_key = JsValue::from_str("dst");
    let ext_out_msgs = out_msgs
        .unchecked_into::<js_sys::Array>()
        .iter()
        .filter_map(|message| {
            match js_sys::Reflect::get(&message, &body_key) {
                Ok(dst) if dst.is_string() => return None,
                Err(error) => return Some(Err(error)),
                _ => {}
            };

            Some(
                match js_sys::Reflect::get(&message, &dst_key).map(|item| item.as_string()) {
                    Ok(Some(body)) => parse_slice(&body),
                    Ok(None) => Err(AbiError::ExpectedMessageBody).handle_error(),
                    Err(error) => Err(error),
                },
            )
        })
        .collect::<Result<Vec<_>, JsValue>>()?;

    let output = nt::helpers::abi::process_raw_outputs(&ext_out_msgs, method).handle_error()?;

    Ok(Some(
        ObjectBuilder::new()
            .set("method", &method.name)
            .set("input", make_tokens_object(&input)?)
            .set("output", make_tokens_object(&output)?)
            .build()
            .unchecked_into(),
    ))
}

fn guess_method_by_input<'a>(
    contract_abi: &'a ton_abi::Contract,
    message_body: &ton_types::SliceData,
    method: JsMethodName,
    internal: bool,
) -> Result<Option<&'a ton_abi::Function>, JsValue> {
    match parse_method_name(method)? {
        MethodName::Known(name) => Ok(Some(contract_abi.function(&name).handle_error()?)),
        MethodName::Guess(names) => {
            let input_id =
                match read_input_function_id(contract_abi, message_body.clone(), internal) {
                    Ok(id) => id,
                    Err(_) => return Ok(None),
                };

            let mut method = None;
            for name in names.iter() {
                let function = contract_abi.function(name).handle_error()?;
                if function.input_id == input_id {
                    method = Some(function);
                    break;
                }
            }
            Ok(method)
        }
    }
}

fn read_input_function_id(
    contract_abi: &ton_abi::Contract,
    mut body: ton_types::SliceData,
    internal: bool,
) -> Result<u32, JsValue> {
    if internal {
        read_u32(&body).handle_error()
    } else {
        if body.get_next_bit().handle_error()? {
            body.move_by(ed25519_dalek::SIGNATURE_LENGTH * 8)
                .handle_error()?
        }
        for header in contract_abi.header() {
            match header.kind {
                ton_abi::ParamType::PublicKey => {
                    if body.get_next_bit().handle_error()? {
                        body.move_by(ed25519_dalek::PUBLIC_KEY_LENGTH * 8)
                            .handle_error()?;
                    }
                }
                ton_abi::ParamType::Time => body.move_by(64).handle_error()?,
                ton_abi::ParamType::Expire => body.move_by(32).handle_error()?,
                _ => return Err(AbiError::UnsupportedHeader).handle_error(),
            }
        }
        read_u32(&body).handle_error()
    }
}

pub enum MethodName {
    Known(String),
    Guess(Vec<String>),
}

#[wasm_bindgen(typescript_custom_section)]
const METHOD_NAME: &str = r#"
export type MethodName = string | string[]
"#;

pub fn parse_method_name(value: JsMethodName) -> Result<MethodName, JsValue> {
    let value: JsValue = value.unchecked_into();
    if let Some(value) = value.as_string() {
        Ok(MethodName::Known(value))
    } else if js_sys::Array::is_array(&value) {
        let value: js_sys::Array = value.unchecked_into();
        Ok(MethodName::Guess(
            value
                .iter()
                .map(|value| match value.as_string() {
                    Some(value) => Ok(value),
                    None => Err(AbiError::ExpectedStringOrArray),
                })
                .collect::<Result<Vec<_>, AbiError>>()
                .handle_error()?,
        ))
    } else {
        Err(AbiError::ExpectedStringOrArray).handle_error()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const DECODED_INPUT: &str = r#"
export type DecodedInput = {
    method: string,
    input: TokensObject,
};
"#;

#[wasm_bindgen(typescript_custom_section)]
const DECODED_OUTPUT: &str = r#"
export type DecodedOutput = {
    method: string,
    output: TokensObject,
};
"#;

#[wasm_bindgen(typescript_custom_section)]
const DECODED_TRANSACTION: &str = r#"
export type DecodedTransaction = {
    method: string,
    input: TokensObject,
    output: TokensObject,
};
"#;

#[wasm_bindgen(typescript_custom_section)]
const EXECUTION_OUTPUT: &str = r#"
export type ExecutionOutput = {
    output?: TokensObject,
    code: number,
};
"#;

fn make_execution_output(
    data: &nt::helpers::abi::ExecutionOutput,
) -> Result<ExecutionOutput, JsValue> {
    Ok(ObjectBuilder::new()
        .set(
            "output",
            data.tokens.as_deref().map(make_tokens_object).transpose()?,
        )
        .set("code", data.result_code)
        .build()
        .unchecked_into())
}

#[wasm_bindgen(typescript_custom_section)]
const TOKEN: &str = r#"
export type AbiToken =
    | boolean
    | string
    | number
    | { [K in string]: AbiToken }
    | AbiToken[]
    | [AbiToken, AbiToken][];
    
type TokensObject = { [K in string]: AbiToken };
"#;

fn parse_token_value(
    param: &ton_abi::ParamType,
    value: JsValue,
) -> Result<ton_abi::TokenValue, AbiError> {
    let value = match param {
        &ton_abi::ParamType::Uint(size) => {
            let number = if let Some(value) = value.as_string() {
                BigUint::from_str(&value).map_err(|_| AbiError::InvalidNumber)
            } else if let Some(value) = value.as_f64() {
                if value >= 0.0 {
                    Ok(BigUint::from(value as u64))
                } else {
                    Err(AbiError::ExpectedUnsignedNumber)
                }
            } else {
                Err(AbiError::ExpectedStringOrNumber)
            }?;

            ton_abi::TokenValue::Uint(ton_abi::Uint { number, size })
        }
        &ton_abi::ParamType::Int(size) => {
            let number = if let Some(value) = value.as_string() {
                BigInt::from_str(&value).map_err(|_| AbiError::InvalidNumber)
            } else if let Some(value) = value.as_f64() {
                Ok(BigInt::from(value as u64))
            } else {
                Err(AbiError::ExpectedStringOrNumber)
            }?;

            ton_abi::TokenValue::Int(ton_abi::Int { number, size })
        }
        ton_abi::ParamType::Bool => value
            .as_bool()
            .map(ton_abi::TokenValue::Bool)
            .ok_or(AbiError::ExpectedBoolean)?,
        ton_abi::ParamType::Tuple(params) => {
            if !value.is_object() {
                return Err(AbiError::ExpectedObject);
            }

            let mut result = Vec::with_capacity(params.len());
            for param in params.iter() {
                let value = js_sys::Reflect::get(&value, &JsValue::from_str(&param.name))
                    .map_err(|_| AbiError::TuplePropertyNotFound)?;
                result.push(parse_token(param, value)?)
            }

            ton_abi::TokenValue::Tuple(result)
        }
        ton_abi::ParamType::Array(param) => {
            if !js_sys::Array::is_array(&value) {
                return Err(AbiError::ExpectedArray);
            }
            let value: js_sys::Array = value.unchecked_into();

            ton_abi::TokenValue::Array(
                value
                    .iter()
                    .map(|value| parse_token_value(param.as_ref(), value))
                    .collect::<Result<_, AbiError>>()?,
            )
        }
        ton_abi::ParamType::FixedArray(param, size) => {
            if !js_sys::Array::is_array(&value) {
                return Err(AbiError::ExpectedArray);
            }
            let value: js_sys::Array = value.unchecked_into();

            if value.length() != *size as u32 {
                return Err(AbiError::InvalidArrayLength);
            }

            ton_abi::TokenValue::FixedArray(
                value
                    .iter()
                    .map(|value| parse_token_value(param.as_ref(), value))
                    .collect::<Result<_, AbiError>>()?,
            )
        }
        ton_abi::ParamType::Cell => {
            let value = if let Some(value) = value.as_string() {
                if value.is_empty() {
                    Ok(ton_types::Cell::default())
                } else {
                    base64::decode(&value)
                        .map_err(|_| AbiError::InvalidCell)
                        .and_then(|value| {
                            ton_types::deserialize_tree_of_cells(&mut std::io::Cursor::new(&value))
                                .map_err(|_| AbiError::InvalidCell)
                        })
                }
            } else if value.is_null() {
                Ok(ton_types::Cell::default())
            } else {
                Err(AbiError::ExpectedString)
            }?;

            ton_abi::TokenValue::Cell(value)
        }
        ton_abi::ParamType::Map(param_key, param_value) => {
            if !js_sys::Array::is_array(&value) {
                return Err(AbiError::ExpectedArray);
            }
            let value: js_sys::Array = value.unchecked_into();

            let mut result = HashMap::with_capacity(value.length() as usize);

            for value in value.iter() {
                if !js_sys::Array::is_array(&value) {
                    return Err(AbiError::ExpectedMapItem);
                }
                let value: js_sys::Array = value.unchecked_into();
                if value.length() != 2 {
                    return Err(AbiError::ExpectedMapItem);
                }

                let key = parse_token_value(param_key.as_ref(), value.get(0))?;
                let value = parse_token_value(param_value.as_ref(), value.get(1))?;

                result.insert(
                    serde_json::to_string(&key).map_err(|_| AbiError::InvalidMappingKey)?,
                    value,
                );
            }

            ton_abi::TokenValue::Map(*param_key.clone(), result)
        }
        ton_abi::ParamType::Address => {
            let value = if let Some(value) = value.as_string() {
                MsgAddressInt::from_str(&value).map_err(|_| AbiError::InvalidAddress)
            } else {
                Err(AbiError::ExpectedString)
            }?;

            ton_abi::TokenValue::Address(match value {
                MsgAddressInt::AddrStd(value) => ton_block::MsgAddress::AddrStd(value),
                MsgAddressInt::AddrVar(value) => ton_block::MsgAddress::AddrVar(value),
            })
        }
        ton_abi::ParamType::Bytes => {
            let value = if let Some(value) = value.as_string() {
                if value.is_empty() {
                    Ok(Vec::new())
                } else {
                    base64::decode(&value).map_err(|_| AbiError::InvalidBytes)
                }
            } else {
                Err(AbiError::ExpectedString)
            }?;

            ton_abi::TokenValue::Bytes(value)
        }
        &ton_abi::ParamType::FixedBytes(size) => {
            let value = if let Some(value) = value.as_string() {
                base64::decode(&value).map_err(|_| AbiError::InvalidBytes)
            } else {
                Err(AbiError::ExpectedString)
            }?;

            if value.len() != size {
                return Err(AbiError::InvalidBytesLength);
            }

            ton_abi::TokenValue::FixedBytes(value)
        }
        ton_abi::ParamType::Gram => {
            let value = if let Some(value) = value.as_string() {
                u128::from_str(&value).map_err(|_| AbiError::InvalidNumber)
            } else if let Some(value) = value.as_f64() {
                if value >= 0.0 {
                    Ok(value as u128)
                } else {
                    Err(AbiError::InvalidNumber)
                }
            } else {
                Err(AbiError::ExpectedStringOrNumber)
            }?;

            ton_abi::TokenValue::Gram(ton_block::Grams(value))
        }
        ton_abi::ParamType::Time => {
            let value = if let Some(value) = value.as_string() {
                u64::from_str(&value).map_err(|_| AbiError::InvalidNumber)
            } else if let Some(value) = value.as_f64() {
                if value >= 0.0 {
                    Ok(value as u64)
                } else {
                    Err(AbiError::ExpectedUnsignedNumber)
                }
            } else {
                Err(AbiError::ExpectedStringOrNumber)
            }?;

            ton_abi::TokenValue::Time(value)
        }
        ton_abi::ParamType::Expire => {
            let value = if let Some(value) = value.as_f64() {
                if value >= 0.0 {
                    Ok(value as u32)
                } else {
                    Err(AbiError::ExpectedUnsignedNumber)
                }
            } else if let Some(value) = value.as_string() {
                u32::from_str(&value).map_err(|_| AbiError::InvalidNumber)
            } else {
                Err(AbiError::ExpectedStringOrNumber)
            }?;

            ton_abi::TokenValue::Expire(value)
        }
        ton_abi::ParamType::PublicKey => {
            let value = if let Some(value) = value.as_string() {
                if value.is_empty() {
                    Ok(None)
                } else {
                    hex::decode(&value)
                        .map_err(|_| AbiError::InvalidPublicKey)
                        .and_then(|value| {
                            ed25519_dalek::PublicKey::from_bytes(&value)
                                .map_err(|_| AbiError::InvalidPublicKey)
                        })
                        .map(Some)
                }
            } else {
                Err(AbiError::ExpectedString)
            }?;

            ton_abi::TokenValue::PublicKey(value)
        }
        _ => return Err(AbiError::UnexpectedToken),
    };

    Ok(value)
}

fn make_token_value(value: &ton_abi::TokenValue) -> Result<JsValue, JsValue> {
    Ok(match value {
        ton_abi::TokenValue::Uint(value) => JsValue::from(value.number.to_string()),
        ton_abi::TokenValue::Int(value) => JsValue::from(value.number.to_string()),
        ton_abi::TokenValue::Bool(value) => JsValue::from(*value),
        ton_abi::TokenValue::Tuple(values) => {
            let tuple = js_sys::Object::new();
            for token in values.iter() {
                js_sys::Reflect::set(
                    &tuple,
                    &JsValue::from_str(&token.name),
                    &make_token_value(&token.value)?,
                )
                .trust_me();
            }
            tuple.unchecked_into()
        }
        ton_abi::TokenValue::Array(values) | ton_abi::TokenValue::FixedArray(values) => values
            .iter()
            .map(make_token_value)
            .collect::<Result<js_sys::Array, _>>()
            .map(JsCast::unchecked_into)?,
        ton_abi::TokenValue::Cell(value) => {
            let data = ton_types::serialize_toc(value).handle_error()?;
            JsValue::from(base64::encode(&data))
        }
        ton_abi::TokenValue::Map(_, values) => values
            .iter()
            .map(|(key, value)| {
                Result::<JsValue, JsValue>::Ok(
                    [JsValue::from_str(key.as_str()), make_token_value(&value)?]
                        .iter()
                        .collect::<js_sys::Array>()
                        .unchecked_into(),
                )
            })
            .collect::<Result<js_sys::Array, _>>()?
            .unchecked_into(),
        ton_abi::TokenValue::Address(value) => JsValue::from(value.to_string()),
        ton_abi::TokenValue::Bytes(value) | ton_abi::TokenValue::FixedBytes(value) => {
            JsValue::from(base64::encode(value))
        }
        ton_abi::TokenValue::Gram(value) => JsValue::from(value.0.to_string()),
        ton_abi::TokenValue::Time(value) => JsValue::from(value.to_string()),
        ton_abi::TokenValue::Expire(value) => JsValue::from(*value),
        ton_abi::TokenValue::PublicKey(value) => {
            JsValue::from(value.map(|value| hex::encode(value.as_bytes())))
        }
    })
}

fn parse_token(param: &ton_abi::Param, value: JsValue) -> Result<ton_abi::Token, AbiError> {
    let value = parse_token_value(&param.kind, value)?;
    Ok(ton_abi::Token {
        name: param.name.clone(),
        value,
    })
}

fn make_tokens_object(tokens: &[ton_abi::Token]) -> Result<TokensObject, JsValue> {
    let object = js_sys::Object::new();
    for token in tokens.iter() {
        js_sys::Reflect::set(
            &object,
            &JsValue::from_str(&token.name),
            &make_token_value(&token.value)?,
        )
        .trust_me();
    }
    Ok(object.unchecked_into())
}

fn parse_tokens_object(
    params: &[ton_abi::Param],
    tokens: TokensObject,
) -> Result<Vec<ton_abi::Token>, AbiError> {
    if params.is_empty() {
        return Ok(Default::default());
    }

    if !tokens.is_object() {
        return Err(AbiError::ExpectedObject);
    }

    let mut result = Vec::with_capacity(params.len());
    for param in params.iter() {
        let value = js_sys::Reflect::get(&tokens, &JsValue::from_str(&param.name))
            .map_err(|_| AbiError::TuplePropertyNotFound)?;
        result.push(parse_token(param, value)?)
    }

    Ok(result)
}

fn insert_init_data(
    contract_abi: &ton_abi::Contract,
    data: ton_types::SliceData,
    public_key: &Option<ed25519_dalek::PublicKey>,
    tokens: TokensObject,
) -> Result<ton_types::SliceData, JsValue> {
    let mut map = ton_types::HashmapE::with_hashmap(
        ton_abi::Contract::DATA_MAP_KEYLEN,
        data.reference_opt(0),
    );

    if let Some(public_key) = public_key {
        map.set_builder(
            0u64.write_to_new_cell().trust_me().into(),
            &ton_types::BuilderData::new()
                .append_raw(public_key.as_bytes(), 256)
                .trust_me(),
        )
        .handle_error()?;
    }

    if !contract_abi.data().is_empty() {
        if !tokens.is_object() {
            return Err(AbiError::ExpectedObject).handle_error();
        }

        for (param_name, param) in contract_abi.data() {
            let value = js_sys::Reflect::get(&tokens, &JsValue::from_str(param_name.as_str()))
                .map_err(|_| AbiError::TuplePropertyNotFound)
                .handle_error()?;

            let builder = parse_token_value(&param.value.kind, value)
                .handle_error()?
                .pack_into_chain(2)
                .handle_error()?;

            map.set_builder(param.key.write_to_new_cell().trust_me().into(), &builder)
                .handle_error()?;
        }
    }

    map.write_to_new_cell().map(From::from).handle_error()
}

#[derive(thiserror::Error, Debug)]
enum AbiError {
    #[error("Unexpected token")]
    UnexpectedToken,
    #[error("Expected boolean")]
    ExpectedBoolean,
    #[error("Expected string")]
    ExpectedString,
    #[error("Expected string or array")]
    ExpectedStringOrArray,
    #[error("Expected string or number")]
    ExpectedStringOrNumber,
    #[error("Expected unsigned number")]
    ExpectedUnsignedNumber,
    #[error("Expected array")]
    ExpectedArray,
    #[error("Expected tuple of two elements")]
    ExpectedMapItem,
    #[error("Expected object")]
    ExpectedObject,
    #[error("Expected message")]
    ExpectedMessage,
    #[error("Expected message body")]
    ExpectedMessageBody,
    #[error("Invalid array length")]
    InvalidArrayLength,
    #[error("Invalid number")]
    InvalidNumber,
    #[error("Invalid cell")]
    InvalidCell,
    #[error("Invalid address")]
    InvalidAddress,
    #[error("Invalid base64 encoded bytes")]
    InvalidBytes,
    #[error("Invalid bytes length")]
    InvalidBytesLength,
    #[error("Invalid public key")]
    InvalidPublicKey,
    #[error("Invalid mapping key")]
    InvalidMappingKey,
    #[error("Tuple property not found")]
    TuplePropertyNotFound,
    #[error("Unsupported header")]
    UnsupportedHeader,
}

fn parse_contract_abi(contract_abi: &str) -> Result<ton_abi::Contract, JsValue> {
    ton_abi::Contract::load(&mut std::io::Cursor::new(contract_abi)).handle_error()
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "AbiToken")]
    pub type JsTokenValue;

    #[wasm_bindgen(typescript_type = "TokensObject")]
    pub type TokensObject;

    #[wasm_bindgen(typescript_type = "ExecutionOutput")]
    pub type ExecutionOutput;

    #[wasm_bindgen(typescript_type = "DecodedTransaction")]
    pub type DecodedTransaction;

    #[wasm_bindgen(typescript_type = "MethodName")]
    pub type JsMethodName;

    #[wasm_bindgen(typescript_type = "DecodedInput")]
    pub type DecodedInput;

    #[wasm_bindgen(typescript_type = "DecodedOutput")]
    pub type DecodedOutput;
}