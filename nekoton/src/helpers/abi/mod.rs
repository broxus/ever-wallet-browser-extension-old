use std::borrow::Cow;
use std::collections::{BTreeMap, HashMap};
use std::str::FromStr;

use num_bigint::{BigInt, BigUint};
use num_traits::Num;
use ton_block::{Deserializable, GetRepresentationHash, MsgAddressInt, Serializable};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use nt_abi::{read_function_id, FunctionExt};
use nt_utils::TrustMe;

use crate::utils::*;

#[wasm_bindgen(js_name = "runLocal")]
pub fn run_local(
    clock: &ClockWithOffset,
    last_transaction_id: crate::core::models::LastTransactionId,
    account_stuff_boc: &str,
    contract_abi: &str,
    method: &str,
    input: TokensObject,
) -> Result<ExecutionOutput, JsValue> {
    use crate::core::models::*;

    let last_transaction_id = parse_last_transaction_id(last_transaction_id)?;
    let account_stuff = parse_account_stuff(account_stuff_boc)?;
    let contract_abi = parse_contract_abi(contract_abi)?;
    let method = contract_abi.function(method).handle_error()?;
    let input = parse_tokens_object(&method.inputs, input).handle_error()?;

    let output = method
        .run_local(
            clock.inner.as_ref(),
            account_stuff,
            &last_transaction_id,
            &input,
        )
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

#[wasm_bindgen(js_name = "createExternalMessageWithoutSignature")]
pub fn create_external_message_without_signature(
    dst: &str,
    contract_abi: &str,
    method: &str,
    state_init: Option<String>,
    input: TokensObject,
    timeout: u32,
) -> Result<crate::crypto::JsSignedMessage, JsValue> {
    use nt::core::models::{Expiration, ExpireAt};

    // Parse params
    let dst = parse_address(dst)?;
    let contract_abi = parse_contract_abi(contract_abi)?;
    let method = contract_abi.function(method).handle_error()?;
    let state_init = state_init
        .as_deref()
        .map(ton_block::StateInit::construct_from_base64)
        .transpose()
        .handle_error()?;
    let input = parse_tokens_object(&method.inputs, input).handle_error()?;

    // Prepare headers
    let time = chrono::Utc::now().timestamp_millis() as u64;
    let expire_at = ExpireAt::new_from_millis(Expiration::Timeout(timeout), time);

    let mut header = HashMap::with_capacity(3);
    header.insert("time".to_string(), ton_abi::TokenValue::Time(time));
    header.insert(
        "expire".to_string(),
        ton_abi::TokenValue::Expire(expire_at.timestamp),
    );
    header.insert("pubkey".to_string(), ton_abi::TokenValue::PublicKey(None));

    // Encode body
    let body = method
        .encode_input(&header, &input, false, None)
        .handle_error()?;

    // Build message
    let mut message =
        ton_block::Message::with_ext_in_header(ton_block::ExternalInboundMessageHeader {
            dst,
            ..Default::default()
        });
    if let Some(state_init) = state_init {
        message.set_state_init(state_init);
    }
    message.set_body(body.into());

    // Serialize message
    crate::crypto::make_signed_message(nt::crypto::SignedMessage {
        message,
        expire_at: expire_at.timestamp,
    })
}

#[wasm_bindgen(js_name = "createExternalMessage")]
pub fn create_external_message(
    clock: &ClockWithOffset,
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
            clock.inner.as_ref(),
            message,
            nt::core::models::Expiration::Timeout(timeout),
            &public_key,
            Cow::Owned(method.clone()),
            input,
        )
        .handle_error()?,
    })
}

#[wasm_bindgen(js_name = "parseKnownPayload")]
pub fn parse_known_payload(payload: &str) -> Option<crate::core::models::KnownPayload> {
    let payload = parse_slice(payload).ok()?;
    crate::core::models::make_known_payload(nt::core::parsing::parse_payload(payload))
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

#[wasm_bindgen(js_name = "decodeEvent")]
pub fn decode_event(
    message_body: &str,
    contract_abi: &str,
    event: JsMethodName,
) -> Result<Option<DecodedEvent>, JsValue> {
    let message_body = parse_slice(message_body)?;
    let contract_abi = parse_contract_abi(contract_abi)?;
    let events = contract_abi.events();
    let event = match parse_method_name(event)? {
        MethodName::Known(name) => match events.get(&name) {
            Some(event) => event,
            None => return Ok(None),
        },
        MethodName::Guess(names) => {
            let id = match read_input_function_id(&contract_abi, message_body.clone(), true) {
                Ok(id) => id,
                Err(_) => return Ok(None),
            };

            let mut event = None;
            for name in names.iter() {
                let function = match events.get(name) {
                    Some(function) => function,
                    None => continue,
                };

                if function.id == id {
                    event = Some(function);
                    break;
                }
            }

            match event {
                Some(event) => event,
                None => return Ok(None),
            }
        }
    };

    let data = event.decode_input(message_body).handle_error()?;
    Ok(Some(
        ObjectBuilder::new()
            .set("event", &event.name)
            .set("data", make_tokens_object(&data)?)
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
            let output_id = nt_abi::read_function_id(&message_body).handle_error()?;

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
            match js_sys::Reflect::get(&message, &dst_key) {
                Ok(dst) if dst.is_string() => return None,
                Err(error) => return Some(Err(error)),
                _ => {}
            };

            Some(
                match js_sys::Reflect::get(&message, &body_key).map(|item| item.as_string()) {
                    Ok(Some(body)) => parse_slice(&body),
                    Ok(None) => Err(AbiError::ExpectedMessageBody).handle_error(),
                    Err(error) => Err(error),
                },
            )
        })
        .collect::<Result<Vec<_>, JsValue>>()?;

    let output = nt_abi::process_raw_outputs(&ext_out_msgs, method).handle_error()?;

    Ok(Some(
        ObjectBuilder::new()
            .set("method", &method.name)
            .set("input", make_tokens_object(&input)?)
            .set("output", make_tokens_object(&output)?)
            .build()
            .unchecked_into(),
    ))
}

#[wasm_bindgen(js_name = "decodeTransactionEvents")]
pub fn decode_transaction_events(
    transaction: crate::core::models::Transaction,
    contract_abi: &str,
) -> Result<DecodedTransactionEvents, JsValue> {
    let transaction: JsValue = transaction.unchecked_into();
    if !transaction.is_object() {
        return Err(AbiError::ExpectedObject).handle_error();
    }

    let contract_abi = parse_contract_abi(contract_abi)?;

    let out_msgs = js_sys::Reflect::get(&transaction, &JsValue::from_str("outMessages"))?;
    if !js_sys::Array::is_array(&out_msgs) {
        return Err(AbiError::ExpectedArray).handle_error();
    }

    let body_key = JsValue::from_str("body");
    let dst_key = JsValue::from_str("dst");
    let ext_out_msgs = out_msgs
        .unchecked_into::<js_sys::Array>()
        .iter()
        .filter_map(|message| {
            match js_sys::Reflect::get(&message, &dst_key) {
                Ok(dst) if dst.is_string() => return None,
                Err(error) => return Some(Err(error)),
                _ => {}
            };

            Some(
                match js_sys::Reflect::get(&message, &body_key).map(|item| item.as_string()) {
                    Ok(Some(body)) => parse_slice(&body),
                    Ok(None) => return None,
                    Err(error) => Err(error),
                },
            )
        })
        .collect::<Result<Vec<_>, JsValue>>()?;

    let events = ext_out_msgs
        .into_iter()
        .filter_map(|body| {
            let id = read_function_id(&body).ok()?;
            let event = contract_abi.event_by_id(id).ok()?;
            let tokens = event.decode_input(body).ok()?;

            let data = match make_tokens_object(&tokens) {
                Ok(data) => data,
                Err(e) => return Some(Err(e)),
            };

            Some(Ok(ObjectBuilder::new()
                .set("event", &event.name)
                .set("data", data)
                .build()))
        })
        .collect::<Result<js_sys::Array, JsValue>>()?;

    Ok(events.unchecked_into())
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
    if !internal {
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
    }
    read_function_id(&body).handle_error()
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
const DECODED_EVENT: &str = r#"
export type DecodedEvent = {
    event: string,
    data: TokensObject,
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
const DECODED_TRANSACTION_EVENTS: &str = r#"
export type DecodedTransactionEvents = Array<DecodedEvent>;
"#;

#[wasm_bindgen(typescript_custom_section)]
const EXECUTION_OUTPUT: &str = r#"
export type ExecutionOutput = {
    output?: TokensObject,
    code: number,
};
"#;

fn make_execution_output(data: &nt_abi::ExecutionOutput) -> Result<ExecutionOutput, JsValue> {
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
    | (readonly [AbiToken, AbiToken])[];

type TokensObject = { [K in string]: AbiToken };
"#;

fn parse_token_value(
    param: &ton_abi::ParamType,
    value: JsValue,
) -> Result<ton_abi::TokenValue, AbiError> {
    let value = match param {
        &ton_abi::ParamType::Uint(size) | &ton_abi::ParamType::VarUint(size) => {
            let number = if let Some(value) = value.as_string() {
                let value = value.trim();
                if let Some(value) = value.strip_prefix("0x") {
                    BigUint::from_str_radix(value, 16)
                } else {
                    BigUint::from_str(value)
                }
                .map_err(|_| AbiError::InvalidNumber)
            } else if let Some(value) = value.as_f64() {
                #[allow(clippy::float_cmp)]
                if value as u64 as f64 != value {
                    return Err(AbiError::ExpectedIntegerNumber);
                }

                if value >= 0.0 {
                    Ok(BigUint::from(value as u64))
                } else {
                    Err(AbiError::ExpectedUnsignedNumber)
                }
            } else {
                Err(AbiError::ExpectedStringOrNumber)
            }?;

            match param {
                ton_abi::ParamType::Uint(_) => {
                    ton_abi::TokenValue::Uint(ton_abi::Uint { number, size })
                }
                _ => ton_abi::TokenValue::VarUint(size, number),
            }
        }
        &ton_abi::ParamType::Int(size) | &ton_abi::ParamType::VarInt(size) => {
            let number = if let Some(value) = value.as_string() {
                let value = value.trim();
                if let Some(value) = value.strip_prefix("0x") {
                    BigInt::from_str_radix(value, 16)
                } else {
                    BigInt::from_str(value)
                }
                .map_err(|_| AbiError::InvalidNumber)
            } else if let Some(value) = value.as_f64() {
                #[allow(clippy::float_cmp)]
                if value as i64 as f64 != value {
                    return Err(AbiError::ExpectedIntegerNumber);
                }

                Ok(BigInt::from(value as i64))
            } else {
                Err(AbiError::ExpectedStringOrNumber)
            }?;

            match param {
                ton_abi::ParamType::Int(_) => {
                    ton_abi::TokenValue::Int(ton_abi::Int { number, size })
                }
                _ => ton_abi::TokenValue::VarInt(size, number),
            }
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
                *param.clone(),
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
                *param.clone(),
                value
                    .iter()
                    .map(|value| parse_token_value(param.as_ref(), value))
                    .collect::<Result<_, AbiError>>()?,
            )
        }
        ton_abi::ParamType::Cell => {
            let value = if let Some(value) = value.as_string() {
                let value = value.trim();
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

            let mut result = BTreeMap::new();

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

                result.insert(key.to_string(), value);
            }

            ton_abi::TokenValue::Map(*param_key.clone(), *param_value.clone(), result)
        }
        ton_abi::ParamType::Address => {
            let value = if let Some(value) = value.as_string() {
                let value = value.trim();
                MsgAddressInt::from_str(value).map_err(|_| AbiError::InvalidAddress)
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
                let value = value.trim();
                if value.is_empty() {
                    Ok(Vec::new())
                } else {
                    base64::decode(value).map_err(|_| AbiError::InvalidBytes)
                }
            } else {
                Err(AbiError::ExpectedString)
            }?;

            ton_abi::TokenValue::Bytes(value)
        }
        ton_abi::ParamType::String => {
            let value = value.as_string().ok_or(AbiError::ExpectedString)?;
            ton_abi::TokenValue::String(value)
        }
        &ton_abi::ParamType::FixedBytes(size) => {
            let value = if let Some(value) = value.as_string() {
                let value = value.trim();
                base64::decode(value).map_err(|_| AbiError::InvalidBytes)
            } else {
                Err(AbiError::ExpectedString)
            }?;

            if value.len() != size {
                return Err(AbiError::InvalidBytesLength);
            }

            ton_abi::TokenValue::FixedBytes(value)
        }
        ton_abi::ParamType::Token => {
            let value = if let Some(value) = value.as_string() {
                let value = value.trim();
                if let Some(value) = value.strip_prefix("0x") {
                    u128::from_str_radix(value, 16)
                } else {
                    u128::from_str(value)
                }
                .map_err(|_| AbiError::InvalidNumber)
            } else if let Some(value) = value.as_f64() {
                if value >= 0.0 {
                    Ok(value as u128)
                } else {
                    Err(AbiError::InvalidNumber)
                }
            } else {
                Err(AbiError::ExpectedStringOrNumber)
            }?;

            ton_abi::TokenValue::Token(ton_block::Grams(value))
        }
        ton_abi::ParamType::Time => {
            let value = if let Some(value) = value.as_string() {
                let value = value.trim();
                if let Some(value) = value.strip_prefix("0x") {
                    u64::from_str_radix(value, 16)
                } else {
                    u64::from_str(value)
                }
                .map_err(|_| AbiError::InvalidNumber)
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
                let value = value.trim();
                if let Some(value) = value.strip_prefix("0x") {
                    u32::from_str_radix(value, 16)
                } else {
                    u32::from_str(value)
                }
                .map_err(|_| AbiError::InvalidNumber)
            } else {
                Err(AbiError::ExpectedStringOrNumber)
            }?;

            ton_abi::TokenValue::Expire(value)
        }
        ton_abi::ParamType::PublicKey => {
            let value = if let Some(value) = value.as_string() {
                let value = value.trim();
                if value.is_empty() {
                    Ok(None)
                } else {
                    hex::decode(value.strip_prefix("0x").unwrap_or(value))
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
        ton_abi::ParamType::Optional(param) => {
            if value.is_null() {
                ton_abi::TokenValue::Optional(*param.clone(), None)
            } else {
                let value = Box::new(parse_token_value(param, value)?);
                ton_abi::TokenValue::Optional(*param.clone(), Some(value))
            }
        }
        ton_abi::ParamType::Ref(param) => {
            ton_abi::TokenValue::Ref(Box::new(parse_token_value(param, value)?))
        }
    };

    Ok(value)
}

fn make_token_value(value: &ton_abi::TokenValue) -> Result<JsValue, JsValue> {
    Ok(match value {
        ton_abi::TokenValue::Uint(value) => JsValue::from(value.number.to_string()),
        ton_abi::TokenValue::Int(value) => JsValue::from(value.number.to_string()),
        ton_abi::TokenValue::VarInt(_, value) => JsValue::from(value.to_string()),
        ton_abi::TokenValue::VarUint(_, value) => JsValue::from(value.to_string()),
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
        ton_abi::TokenValue::Array(_, values) | ton_abi::TokenValue::FixedArray(_, values) => {
            values
                .iter()
                .map(make_token_value)
                .collect::<Result<js_sys::Array, _>>()
                .map(JsCast::unchecked_into)?
        }
        ton_abi::TokenValue::Cell(value) => {
            let data = ton_types::serialize_toc(value).handle_error()?;
            JsValue::from(base64::encode(&data))
        }
        ton_abi::TokenValue::Map(_, _, values) => values
            .iter()
            .map(|(key, value)| {
                Result::<JsValue, JsValue>::Ok(
                    [JsValue::from_str(key.as_str()), make_token_value(value)?]
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
        ton_abi::TokenValue::String(value) => JsValue::from(value),
        ton_abi::TokenValue::Token(value) => JsValue::from(value.0.to_string()),
        ton_abi::TokenValue::Time(value) => JsValue::from(value.to_string()),
        ton_abi::TokenValue::Expire(value) => JsValue::from(*value),
        ton_abi::TokenValue::PublicKey(value) => {
            JsValue::from(value.map(|value| hex::encode(value.as_bytes())))
        }
        ton_abi::TokenValue::Optional(_, value) => match value {
            Some(value) => make_token_value(value)?,
            None => JsValue::null(),
        },
        ton_abi::TokenValue::Ref(value) => make_token_value(value)?,
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
            ton_types::BuilderData::new()
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
                .pack_into_chain(&ton_abi::contract::ABI_VERSION_2_0)
                .handle_error()?;

            map.set_builder(param.key.write_to_new_cell().trust_me().into(), &builder)
                .handle_error()?;
        }
    }

    map.write_to_new_cell().map(From::from).handle_error()
}

#[wasm_bindgen(typescript_custom_section)]
const PARAM: &str = r#"
export type AbiParamKindUint = 'uint8' | 'uint16' | 'uint32' | 'uint64' | 'uint128' | 'uint160' | 'uint256';
export type AbiParamKindInt = 'int8' | 'int16' | 'int32' | 'int64' | 'int128' | 'int160' | 'int256';
export type AbiParamKindTuple = 'tuple';
export type AbiParamKindBool = 'bool';
export type AbiParamKindCell = 'cell';
export type AbiParamKindAddress = 'address';
export type AbiParamKindBytes = 'bytes';
export type AbiParamKindGram = 'gram';
export type AbiParamKindTime = 'time';
export type AbiParamKindExpire = 'expire';
export type AbiParamKindPublicKey = 'pubkey';
export type AbiParamKindString = 'string';
export type AbiParamKindArray = `${AbiParamKind}[]`;

export type AbiParamKindMap = `map(${AbiParamKindInt | AbiParamKindUint | AbiParamKindAddress},${AbiParamKind | `${AbiParamKind}[]`})`;

export type AbiParamKind =
  | AbiParamKindUint
  | AbiParamKindInt
  | AbiParamKindTuple
  | AbiParamKindBool
  | AbiParamKindCell
  | AbiParamKindAddress
  | AbiParamKindBytes
  | AbiParamKindGram
  | AbiParamKindTime
  | AbiParamKindExpire
  | AbiParamKindPublicKey
  | AbiParamKindString;

export type AbiParam = {
  name: string;
  type: AbiParamKind | AbiParamKindMap | AbiParamKindArray;
  components?: AbiParam[];
};
"#;

fn parse_params_list(params: ParamsList) -> Result<Vec<ton_abi::Param>, AbiError> {
    if !js_sys::Array::is_array(&params) {
        return Err(AbiError::ExpectedObject);
    }
    let params: js_sys::Array = params.unchecked_into();
    params.iter().map(parse_param).collect()
}

fn parse_param(param: JsValue) -> Result<ton_abi::Param, AbiError> {
    if !param.is_object() {
        return Err(AbiError::ExpectedObject);
    }

    let name = match js_sys::Reflect::get(&param, &JsValue::from_str("name"))
        .ok()
        .and_then(|value| value.as_string())
    {
        Some(name) => name,
        _ => return Err(AbiError::ExpectedString),
    };

    let mut kind: ton_abi::ParamType =
        match js_sys::Reflect::get(&param, &JsValue::from_str("type"))
            .ok()
            .and_then(|value| value.as_string())
        {
            Some(kind) => parse_param_type(&kind)?,
            _ => return Err(AbiError::ExpectedString),
        };

    let components: Vec<ton_abi::Param> =
        match js_sys::Reflect::get(&param, &JsValue::from_str("components")) {
            Ok(components) => {
                if js_sys::Array::is_array(&components) {
                    let components: js_sys::Array = components.unchecked_into();
                    components
                        .iter()
                        .map(parse_param)
                        .collect::<Result<_, AbiError>>()?
                } else if components.is_undefined() {
                    Vec::new()
                } else {
                    return Err(AbiError::ExpectedObject);
                }
            }
            _ => return Err(AbiError::ExpectedObject),
        };

    kind.set_components(components)
        .map_err(|_| AbiError::InvalidComponents)?;

    Ok(ton_abi::Param { name, kind })
}

fn parse_param_type(kind: &str) -> Result<ton_abi::ParamType, AbiError> {
    if let Some(']') = kind.chars().last() {
        let num: String = kind
            .chars()
            .rev()
            .skip(1)
            .take_while(|c| *c != '[')
            .collect::<String>()
            .chars()
            .rev()
            .collect();

        let count = kind.len();
        return if num.is_empty() {
            let subtype = parse_param_type(&kind[..count - 2])?;
            Ok(ton_abi::ParamType::Array(Box::new(subtype)))
        } else {
            let len = num
                .parse::<usize>()
                .map_err(|_| AbiError::ExpectedParamType)?;

            let subtype = parse_param_type(&kind[..count - num.len() - 2])?;
            Ok(ton_abi::ParamType::FixedArray(Box::new(subtype), len))
        };
    }

    let result = match kind {
        "bool" => ton_abi::ParamType::Bool,
        "tuple" => ton_abi::ParamType::Tuple(Vec::new()),
        s if s.starts_with("int") => {
            let len = usize::from_str(&s[3..]).map_err(|_| AbiError::ExpectedParamType)?;
            ton_abi::ParamType::Int(len)
        }
        s if s.starts_with("uint") => {
            let len = usize::from_str(&s[4..]).map_err(|_| AbiError::ExpectedParamType)?;
            ton_abi::ParamType::Uint(len)
        }
        s if s.starts_with("varint") => {
            let len = usize::from_str(&s[6..]).map_err(|_| AbiError::ExpectedParamType)?;
            ton_abi::ParamType::Int(len)
        }
        s if s.starts_with("varuint") => {
            let len = usize::from_str(&s[7..]).map_err(|_| AbiError::ExpectedParamType)?;
            ton_abi::ParamType::Uint(len)
        }
        s if s.starts_with("map(") && s.ends_with(')') => {
            let types: Vec<&str> = kind[4..kind.len() - 1].splitn(2, ',').collect();
            if types.len() != 2 {
                return Err(AbiError::ExpectedParamType);
            }

            let key_type = parse_param_type(types[0])?;
            let value_type = parse_param_type(types[1])?;

            match key_type {
                ton_abi::ParamType::Int(_)
                | ton_abi::ParamType::Uint(_)
                | ton_abi::ParamType::Address => {
                    ton_abi::ParamType::Map(Box::new(key_type), Box::new(value_type))
                }
                _ => return Err(AbiError::ExpectedParamType),
            }
        }
        "cell" => ton_abi::ParamType::Cell,
        "address" => ton_abi::ParamType::Address,
        "token" | "gram" => ton_abi::ParamType::Token,
        "bytes" => ton_abi::ParamType::Bytes,
        s if s.starts_with("fixedbytes") => {
            let len = usize::from_str(&s[10..]).map_err(|_| AbiError::ExpectedParamType)?;
            ton_abi::ParamType::FixedBytes(len)
        }
        "time" => ton_abi::ParamType::Time,
        "expire" => ton_abi::ParamType::Expire,
        "pubkey" => ton_abi::ParamType::PublicKey,
        "string" => ton_abi::ParamType::String,
        s if s.starts_with("optional(") && s.ends_with(')') => {
            let inner_type = parse_param_type(&s[9..s.len() - 1])?;
            ton_abi::ParamType::Optional(Box::new(inner_type))
        }
        s if s.starts_with("ref(") && s.ends_with(')') => {
            let inner_type = parse_param_type(&s[4..s.len() - 1])?;
            ton_abi::ParamType::Ref(Box::new(inner_type))
        }
        _ => return Err(AbiError::ExpectedParamType),
    };

    Ok(result)
}
#[wasm_bindgen(js_name = "packIntoCell")]
pub fn pack_into_cell(params: ParamsList, tokens: TokensObject) -> Result<String, JsValue> {
    let params = parse_params_list(params).handle_error()?;
    let tokens = parse_tokens_object(&params, tokens).handle_error()?;

    let cell = nt_abi::pack_into_cell(&tokens).handle_error()?;
    let bytes = ton_types::serialize_toc(&cell).handle_error()?;
    Ok(base64::encode(&bytes))
}

#[wasm_bindgen(js_name = "unpackFromCell")]
pub fn unpack_from_cell(
    params: ParamsList,
    boc: &str,
    allow_partial: bool,
) -> Result<TokensObject, JsValue> {
    let params = parse_params_list(params).handle_error()?;
    let body = base64::decode(boc).handle_error()?;
    let cell =
        ton_types::deserialize_tree_of_cells(&mut std::io::Cursor::new(&body)).handle_error()?;
    nt_abi::unpack_from_cell(&params, cell.into(), allow_partial)
        .handle_error()
        .and_then(|tokens| make_tokens_object(&tokens))
}

#[derive(thiserror::Error, Debug)]
enum AbiError {
    #[error("Expected boolean")]
    ExpectedBoolean,
    #[error("Expected string")]
    ExpectedString,
    #[error("Expected param type")]
    ExpectedParamType,
    #[error("Expected string or array")]
    ExpectedStringOrArray,
    #[error("Expected string or number")]
    ExpectedStringOrNumber,
    #[error("Expected unsigned number")]
    ExpectedUnsignedNumber,
    #[error("Expected integer")]
    ExpectedIntegerNumber,
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
    #[error("Invalid components")]
    InvalidComponents,
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

    #[wasm_bindgen(typescript_type = "DecodedEvent")]
    pub type DecodedEvent;

    #[wasm_bindgen(typescript_type = "DecodedTransactionEvents")]
    pub type DecodedTransactionEvents;

    #[wasm_bindgen(typescript_type = "DecodedOutput")]
    pub type DecodedOutput;

    #[wasm_bindgen(typescript_type = "Array<AbiParam>")]
    pub type ParamsList;
}
