mod contract;
mod message;
mod transaction;

use ton_abi::decode_function_response;

///decodes contract output according to abi
/// # Items
/// `data` -  base64 encoded string with contract output  
/// `abi` - json with contract abi
pub fn decode_base64_with_abi(data: &str, abi: &str) {}
