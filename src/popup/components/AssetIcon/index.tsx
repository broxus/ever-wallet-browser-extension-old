import * as React from 'react'
import { connect } from 'react-redux'
import { AppState, TokensManifestItem } from '@popup/store/app/types'
import { AssetType } from '@shared/utils'

import UserAvatar from '@popup/components/UserAvatar'

import TonLogo from '@popup/img/ton-logo.svg'

type ITonAssetIcon = {
    className?: string
}

export const TonAssetIcon: React.FC<ITonAssetIcon> = ({ className }) => (
    <img src={TonLogo} alt="" className={className} />
)

type IAssetIcon = {
    type: AssetType
    address: string
    className?: string
    tokensMeta: { [rootTokenContract: string]: TokensManifestItem } | undefined
}

const AssetIcon: React.FC<IAssetIcon> = ({ type, address, tokensMeta, className }) => {
    if (type == 'ton_wallet') {
        return <TonAssetIcon className={className} />
    }

    const logoURI = tokensMeta?.[address]?.logoURI
    return logoURI ? (
        <img src={logoURI} alt="" className={className} />
    ) : (
        <UserAvatar address={address} className={className} />
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    tokensMeta: store.app.tokensMeta,
})

export default connect(mapStateToProps)(AssetIcon)
