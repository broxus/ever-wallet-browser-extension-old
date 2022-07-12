import * as React from 'react'
import { useIntl } from 'react-intl'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import Approval from '../Approval'
import { EnterPassword } from '@popup/components/EnterPassword'
import SlidingPanel from '@popup/components/SlidingPanel'
import { parseError, prepareKey, ignoreCheckPassword } from '@popup/utils'
import { PendingApproval } from '@shared/backgroundApi'
import { usePasswordCache } from '@popup/providers/PasswordCacheProvider'

type Props = {
    approval: PendingApproval<'callContractMethod'>
    accountEntries: { [address: string]: nt.AssetsList }
    storedKeys: { [publicKey: string]: nt.KeyStoreEntry }
    checkPassword: (password: nt.KeyPassword) => Promise<boolean>
    onSubmit: (password: nt.KeyPassword, delayedDeletion: boolean) => void
    onReject: () => void
}

export function ApproveContractInteraction({
    approval,
    accountEntries,
    storedKeys,
    checkPassword,
    onSubmit,
    onReject,
}: Props) {
    const intl = useIntl()
    const { origin } = approval
    const { publicKey, recipient, payload } = approval.requestData

    const [inProcess, setInProcess] = React.useState(false)
    const [error, setError] = React.useState<string>()
    const [passwordModalVisible, setPasswordModalVisible] = React.useState(false)

    const keyEntry = storedKeys[publicKey]

    const account = window.ObjectExt.values(accountEntries).find(
        (account) => account.tonWallet.publicKey == publicKey
    )
    if (account == null) {
        !inProcess && onReject()
        setInProcess(true)
        return null
    }

    const passwordCached = usePasswordCache(publicKey)

    const trySubmit = async (password?: string, cache?: boolean) => {
        if (inProcess) {
            return
        }

        if (keyEntry == null) {
            setError('Key entry not found')
            return
        }

        setInProcess(true)
        try {
            const keyPassword = prepareKey({ keyEntry, password, cache })
            if (ignoreCheckPassword(keyPassword) || (await checkPassword(keyPassword))) {
                onSubmit(keyPassword, true)
            } else {
                setError(intl.formatMessage({ id: 'ERROR_INVALID_PASSWORD' }))
                setInProcess(false)
            }
        } catch (e: any) {
            setError(parseError(e))
            setInProcess(false)
        }
    }

    const iterateItems = (object: object) => {
        return Object.entries(object).map(([key, value], i) => (
            <div className="approval__spend-details-param-data__block" key={i}>
                <div className="approval__spend-details-param-data__block--param-name">{key}</div>
                <div className="approval__spend-details-param-data__block--value">
                    {value instanceof Array ? (
                        <pre>{JSON.stringify(value, undefined, 2)}</pre>
                    ) : typeof value === 'object' ? (
                        iterateItems(value)
                    ) : (
                        value.toString()
                    )}
                </div>
            </div>
        ))
    }

    return (
        <>
            <Approval
                account={account}
                title={intl.formatMessage({ id: 'APPROVE_CONTRACT_INTERACTION_APPROVAL_TITLE' })}
                origin={origin}
            >
                <div className="approval__wrapper">
                    <div className="approval__spend-details">
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">
                                {intl.formatMessage({
                                    id: 'APPROVE_CONTRACT_INTERACTION_TERM_CONTRACT',
                                })}
                            </span>
                            <span className="approval__spend-details-param-value">{recipient}</span>
                        </div>
                        {payload && (
                            <div className="approval__spend-details-param">
                                <span className="approval__spend-details-param-desc">
                                    {intl.formatMessage({
                                        id: 'APPROVE_CONTRACT_INTERACTION_TERM_DATA',
                                    })}
                                </span>
                                <div className="approval__spend-details-param-data">
                                    <div className="approval__spend-details-param-data__method">
                                        <span>
                                            {intl.formatMessage({
                                                id: 'APPROVE_CONTRACT_INTERACTION_TERM_DATA_METHOD',
                                            })}
                                        </span>
                                        <span>{payload.method}</span>
                                    </div>
                                    {iterateItems(payload.params)}
                                </div>
                            </div>
                        )}
                    </div>

                    <footer className="approval__footer">
                        <Button
                            type="button"
                            white
                            text={intl.formatMessage({ id: 'REJECT_BTN_TEXT' })}
                            disabled={inProcess}
                            onClick={onReject}
                        />
                        <Button
                            type="submit"
                            text={intl.formatMessage({ id: 'SEND_BTN_TEXT' })}
                            disabled={inProcess || passwordCached == null}
                            onClick={() => {
                                passwordCached ? trySubmit() : setPasswordModalVisible(true)
                            }}
                        />
                    </footer>
                </div>
            </Approval>
            {passwordCached === false && (
                <SlidingPanel
                    isOpen={passwordModalVisible}
                    onClose={() => setPasswordModalVisible(false)}
                >
                    <EnterPassword
                        keyEntry={keyEntry}
                        disabled={inProcess}
                        error={error}
                        handleNext={trySubmit}
                        handleBack={() => setPasswordModalVisible(false)}
                    />
                </SlidingPanel>
            )}
        </>
    )
}
