use anyhow::Error;
use base64::URL_SAFE;
use ton_block::MsgAddrStd;
use ton_types::AccountId;

use crc::crc_16;

mod crc;

///Packs std address to base64 format
/// # Arguments
/// `base64_url` - encode with url friendly charset or not
pub fn pack_std_smc_addr(base64_url: bool, addr: &MsgAddrStd, bounceable: bool) -> String {
    let testnet = false;
    let mut buffer = [0u8; 36];
    buffer[0] = (0x51 - (bounceable as i32) * 0x40 + (testnet as i32) * 0x80) as u8;
    buffer[1] = addr.workchain_id as u8;
    buffer[2..34].copy_from_slice(&addr.address.storage()[0..32]);
    let crc = crc_16(&buffer[..34]);
    buffer[34] = (crc >> 8) as u8;
    buffer[35] = (crc & 0xff) as u8;
    let b64_enc = if base64_url {
        base64::encode_config(&buffer, URL_SAFE)
    } else {
        base64::encode(&buffer)
    };
    assert_eq!(b64_enc.len(), 48);
    b64_enc
}

///Unpacks base64 encoded address to std address
/// # Arguments
/// `base64_url` - encode with url friendly charset or not
pub fn unpack_std_smc_addr(packed: &str, base64_url: bool) -> Result<MsgAddrStd, Error> {
    let unpacked = if base64_url {
        base64::decode_config(packed, URL_SAFE)
    } else {
        base64::decode(packed)
    }
    .map_err(|e| Error::new(e).context("Base64 decode error"))?;
    anyhow::ensure!(
        unpacked.len() == 36,
        "Bad packed address length. Expected 36, got {}",
        unpacked.len()
    );
    let crc = crc_16(&unpacked[..34]);
    if unpacked[34] as u16 != (crc >> 8) || unpacked[35] as u16 != (crc & 0xff) {
        anyhow::bail!("Bad crc");
    }
    let wc = unpacked[1];
    let address = &unpacked[2..34];
    let address = AccountId::from_raw(address.to_vec(), address.len() * 8);
    Ok(MsgAddrStd {
        workchain_id: wc as i8,
        anycast: None,
        address,
    })
}

#[cfg(test)]
mod test {
    use std::str::FromStr;

    #[cfg(test)]
    use pretty_assertions::assert_eq;
    use ton_block::{MsgAddrStd, MsgAddressInt};

    use crate::{pack_std_smc_addr, unpack_std_smc_addr};

    fn get_std_addr() -> MsgAddrStd {
        if let MsgAddressInt::AddrStd(a) = MsgAddressInt::from_str(
            "0:02e3f2284e68a8106b823ab9f2404f33cc43fccad8e1de835bdd96789254686c",
        )
        .unwrap()
        {
            a
        } else {
            unreachable!()
        }
    }
    #[test]
    fn check_pack_std_smc_addr_non_bounce() {
        let addr = get_std_addr();
        assert_eq!(
            pack_std_smc_addr(false, &addr, false),
            "UQAC4/IoTmioEGuCOrnyQE8zzEP8ytjh3oNb3ZZ4klRobAEx"
        );
    }

    #[test]
    fn check_pack_std_smc_addr_url_non_bounce() {
        let addr = get_std_addr();
        assert_eq!(
            pack_std_smc_addr(true, &addr, false),
            "UQAC4_IoTmioEGuCOrnyQE8zzEP8ytjh3oNb3ZZ4klRobAEx"
        );
    }

    #[test]
    fn check_pack_std_smc_addr_bounce() {
        let addr = get_std_addr();
        assert_eq!(
            pack_std_smc_addr(false, &addr, true),
            "EQAC4/IoTmioEGuCOrnyQE8zzEP8ytjh3oNb3ZZ4klRobFz0"
        );
    }

    #[test]
    fn check_pack_std_smc_addr_url_bounce() {
        let addr = get_std_addr();
        assert_eq!(
            pack_std_smc_addr(true, &addr, true),
            "EQAC4_IoTmioEGuCOrnyQE8zzEP8ytjh3oNb3ZZ4klRobFz0"
        );
    }

    #[test]
    fn unpack_no_bounce() {
        let addr = get_std_addr();
        let packed = pack_std_smc_addr(false, &addr, false);
        let address = unpack_std_smc_addr(&packed, false).unwrap();
        assert_eq!(addr, address);
    }
    #[test]
    fn unpack_bounce() {
        let addr = get_std_addr();
        let packed = pack_std_smc_addr(false, &addr, true);
        let address = unpack_std_smc_addr(&packed, false).unwrap();
        assert_eq!(addr, address);
    }
}
