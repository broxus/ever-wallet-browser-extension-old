import * as React from 'react'
import { useIntl } from 'react-intl'
import { connect } from 'react-redux'
import * as nt from '@nekoton'
import { PendingApproval } from '@shared/backgroundApi'
import { AppState, TokensManifestItem } from '@popup/store/app/types'
import { TOKENS_MANIFEST_REPO } from '@popup/utils'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { convertCurrency, convertTokenName } from '@shared/utils'

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

enum TokenNotificationType {
    Error,
    Warning,
}

type TokenNotificationProps = {
    type: TokenNotificationType
}

const TokenNotification: React.FC<TokenNotificationProps> = ({ type, children }) => {
    const typeName =
        type == TokenNotificationType.Error
            ? 'error'
            : type == TokenNotificationType.Warning
            ? 'warning'
            : ''
    const baseClass = 'approval__spend-details-param-notification'
    return <div className={`${baseClass} ${baseClass}--${typeName}`}>{children}</div>
}

enum PhishingAttempt {
    Explicit,
    SameSymbol,
    Suggestion,
}

enum ExistingToken {
    None,
    Trusted,
    Untrusted,
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
    const intl = useIntl()
    const rpcState = useRpcState()
    const rpc = useRpc()

    const { origin } = approval
    const { account: accountAddress, details } = approval.requestData

    const [inProcess, setInProcess] = React.useState(false)
    const [balance, setBalance] = React.useState<string>()

    const account = window.ObjectExt.values(accountEntries).find(
        (account) => account.tonWallet.address == accountAddress
    )
    if (account == null) {
        !inProcess && onReject()
        setInProcess(true)
        return null
    }

    React.useEffect(() => {
        rpc.getTokenWalletBalance(details.tokenWallet)
            .then((balance) => setBalance(balance))
            .catch((e) => {
                console.error(e)
                setBalance('0')
            })
    }, [details.tokenWallet])

    const manifestData = tokensMeta?.[details.address]

    const additionalAssets =
        account.additionalAssets[rpcState.state.selectedConnection.group]?.tokenWallets || []

    let existingToken = ExistingToken.None
    if (tokensMeta != null) {
        for (const { rootTokenContract } of additionalAssets) {
            const info = rpcState.state.knownTokens[rootTokenContract] as nt.Symbol | undefined
            if (info == null || info.name != details.symbol) {
                continue
            }

            existingToken =
                tokensMeta[info.rootTokenContract] != null
                    ? ExistingToken.Trusted
                    : ExistingToken.Untrusted
            break
        }
    }

    let phishingAttempt: PhishingAttempt | undefined
    for (const info of Object.values(tokensMeta || {})) {
        if (info.symbol == details.symbol && info.address != details.address) {
            phishingAttempt = PhishingAttempt.Explicit
            break
        }
    }

    if (existingToken == ExistingToken.Untrusted && manifestData != null) {
        phishingAttempt = PhishingAttempt.Suggestion
    } else if (existingToken != ExistingToken.None) {
        phishingAttempt = PhishingAttempt.SameSymbol
    }

    return (
        <>
            <Approval
                account={account}
                title={intl.formatMessage({ id: 'APPROVE_ADD_ASSET_APPROVAL_TITLE' })}
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
                                    old={details.version != 'Tip3'}
                                    className="root-token-icon noselect"
                                />
                                <div className="root-token-name">{details.name}</div>
                                {tokensMeta != null && (
                                    <TrustStatus trusted={manifestData != null} />
                                )}
                            </div>
                            {tokensMeta != null && manifestData == null && (
                                <TokenNotification type={TokenNotificationType.Error}>
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: intl.formatMessage(
                                                {
                                                    id: 'APPROVE_ADD_ASSET_NOT_PUBLISHED_NOTE',
                                                },
                                                {
                                                    url: TOKENS_MANIFEST_REPO,
                                                }
                                            ) as string,
                                        }}
                                    />
                                </TokenNotification>
                            )}
                        </div>
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">Symbol</span>
                            <span className="approval__spend-details-param-value">
                                {details.symbol}
                            </span>
                            {phishingAttempt === PhishingAttempt.Explicit && (
                                <TokenNotification type={TokenNotificationType.Error}>
                                    <p>
                                        Token has the symbol from the trusted list but a different
                                        root contract address.
                                    </p>
                                    <p>Be careful: it may be a phishing attempt.</p>
                                </TokenNotification>
                            )}
                            {phishingAttempt === PhishingAttempt.SameSymbol && (
                                <TokenNotification type={TokenNotificationType.Error}>
                                    <p>You already have a token with the same symbol.</p>
                                    <p>Be careful: it may be a phishing attempt.</p>
                                </TokenNotification>
                            )}
                            {phishingAttempt === PhishingAttempt.Suggestion && (
                                <TokenNotification type={TokenNotificationType.Warning}>
                                    <p>
                                        You have already added a token with the same symbol before,
                                        however the new one is in the&nbsp;
                                        <a href={TOKENS_MANIFEST_REPO} target="_blank">
                                            official assets repository
                                        </a>
                                        .
                                    </p>
                                    <p>
                                        This may be a new version and you might consider deleting
                                        the previous one.
                                    </p>
                                </TokenNotification>
                            )}
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
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">
                                Current balance
                            </span>
                            <span className="approval__spend-details-param-value">
                                {balance != null
                                    ? `${convertCurrency(
                                          balance,
                                          details.decimals
                                      )} ${convertTokenName(details.symbol)}`
                                    : intl.formatMessage({ id: 'CALCULATING_HINT' })}
                            </span>
                        </div>
                    </div>

                    <footer className="approval__footer">
                        <Button
                            type="button"
                            white
                            text={intl.formatMessage({ id: 'REJECT_BTN_TEXT' })}
                            onClick={onReject}
                        />
                        <Button
                            type="submit"
                            text={intl.formatMessage({ id: 'ADD_BTN_TEXT' })}
                            onClick={() => onSubmit({})}
                        />
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
