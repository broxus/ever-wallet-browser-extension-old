import * as React from 'react'
import { connect } from 'react-redux'
import * as nt from '@nekoton'
import { PendingApproval } from '@shared/backgroundApi'
import { AppState, TokensManifestItem } from '@popup/store/app/types'
import { TOKENS_MANIFEST_REPO } from '@popup/utils'

import Button from '@popup/components/Button'
import AssetIcon from '@popup/components/AssetIcon'
import Approval from '../Approval'

import TrustedTokenIcon from '@popup/img/trusted-token.svg'
import UntrustedTokenIcon from '@popup/img/untrusted-token.svg'

import './style.scss'

type VerificationStatusProps = {
    trusted: boolean
    className?: string
}

const TrustStatus: React.FC<VerificationStatusProps> = ({ trusted, className }) => {
    const url = trusted ? TrustedTokenIcon : UntrustedTokenIcon
    return <img src={url} alt="" className={className} />
}

type Props = {
    approval: PendingApproval<'addTip3Token'>
    accountEntries: { [address: string]: nt.AssetsList }
    tokensMeta: { [rootTokenContract: string]: TokensManifestItem } | undefined
    onSubmit: (stub: {}) => void
    onReject: () => void
}

const ApproveAddAsset: React.FC<Props> = ({
    approval,
    accountEntries,
    tokensMeta,
    onSubmit,
    onReject,
}) => {
    const { origin } = approval
    const { account: accountAddress, details } = approval.requestData

    const [inProcess, setInProcess] = React.useState(false)

    const account = window.ObjectExt.values(accountEntries).find(
        (account) => account.tonWallet.address == accountAddress
    )
    if (account == null) {
        !inProcess && onReject()
        setInProcess(true)
        return null
    }

    const manifestData = tokensMeta?.[details.address]

    return (
        <>
            <Approval
                account={account}
                title="Add TIP3 token"
                origin={origin}
                className={'approval--add-tip3-token'}
            >
                <div className="approval__wrapper">
                    <div className="approval__spend-details">
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">Name</span>
                            <div className="approval__spend-details-param-value approval--add-tip3-token__token-name">
                                <AssetIcon
                                    type={'token_wallet'}
                                    address={details.address}
                                    className="root-token-icon noselect"
                                />
                                <div className="root-token-name">{details.name}</div>
                                {tokensMeta != null && (
                                    <TrustStatus trusted={manifestData != null} />
                                )}
                            </div>
                            {tokensMeta != null && manifestData == null && (
                                <div className="approval__spend-details-param-notification approval__spend-details-param-notification--error">
                                    <p>
                                        This token is not published in the&nbsp;
                                        <a href={TOKENS_MANIFEST_REPO} target="_blank">
                                            official assets repository
                                        </a>
                                        .
                                    </p>
                                    <p>Add it with caution if you trust the source.</p>
                                </div>
                            )}
                        </div>
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">Symbol</span>
                            <span className="approval__spend-details-param-value">
                                {details.symbol}
                            </span>
                        </div>
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">Decimals</span>
                            <span className="approval__spend-details-param-value">
                                {details.decimals}
                            </span>
                        </div>
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">
                                Token root contract address
                            </span>
                            <span className="approval__spend-details-param-value">
                                {details.address}
                            </span>
                        </div>
                    </div>

                    <footer className="approval__footer">
                        <Button type="button" white text="Reject" onClick={onReject} />
                        <Button type="submit" text="Add" onClick={() => onSubmit({})} />
                    </footer>
                </div>
            </Approval>
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    tokensMeta: store.app.tokensMeta,
})

export default connect(mapStateToProps)(ApproveAddAsset)
