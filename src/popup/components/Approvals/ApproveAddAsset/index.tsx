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
                            <span className="approval__spend-details-param-desc">
                                {intl.formatMessage({ id: 'APPROVE_ADD_ASSET_TERM_NAME' })}
                            </span>
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
                                                },
                                                { ignoreTag: true }
                                            ) as string,
                                        }}
                                    />
                                </TokenNotification>
                            )}
                        </div>
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">
                                {intl.formatMessage({ id: 'APPROVE_ADD_ASSET_TERM_SYMBOL' })}
                            </span>
                            <span className="approval__spend-details-param-value">
                                {details.symbol}
                            </span>
                            {phishingAttempt === PhishingAttempt.Explicit && (
                                <TokenNotification type={TokenNotificationType.Error}>
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: intl.formatMessage(
                                                {
                                                    id: 'APPROVE_ADD_ASSET_PHISHING_ATTEMPT_EXPLICIT_NOTE',
                                                },
                                                undefined,
                                                { ignoreTag: true }
                                            ),
                                        }}
                                    />
                                </TokenNotification>
                            )}
                            {phishingAttempt === PhishingAttempt.SameSymbol && (
                                <TokenNotification type={TokenNotificationType.Error}>
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: intl.formatMessage(
                                                {
                                                    id: 'APPROVE_ADD_ASSET_PHISHING_ATTEMPT_SAME_SYMBOL_NOTE',
                                                },
                                                undefined,
                                                { ignoreTag: true }
                                            ),
                                        }}
                                    />
                                </TokenNotification>
                            )}
                            {phishingAttempt === PhishingAttempt.Suggestion && (
                                <TokenNotification type={TokenNotificationType.Warning}>
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: intl.formatMessage(
                                                {
                                                    id: 'APPROVE_ADD_ASSET_PHISHING_ATTEMPT_SUGGESTION_NOTE',
                                                },
                                                {
                                                    url: TOKENS_MANIFEST_REPO,
                                                },
                                                { ignoreTag: true }
                                            ) as string,
                                        }}
                                    />
                                </TokenNotification>
                            )}
                        </div>
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">
                                {intl.formatMessage({ id: 'APPROVE_ADD_ASSET_TERM_DECIMALS' })}
                            </span>
                            <span className="approval__spend-details-param-value">
                                {details.decimals}
                            </span>
                        </div>
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">
                                {intl.formatMessage({
                                    id: 'APPROVE_ADD_ASSET_TERM_TOKEN_ROOT_CONTRACT_ADDRESS',
                                })}
                            </span>
                            <span className="approval__spend-details-param-value">
                                {details.address}
                            </span>
                        </div>
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">
                                {intl.formatMessage({
                                    id: 'APPROVE_ADD_ASSET_TERM_CURRENT_BALANCE',
                                })}
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
