import * as React from 'react'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import Approval from '../Approval'
import { EnterPassword } from '@popup/components/EnterPassword'
import SlidingPanel from '@popup/components/SlidingPanel'
import { parseError, prepareKey } from '@popup/utils'
import { PendingApproval } from '@shared/backgroundApi'

type Props = {
    approval: PendingApproval<'callContractMethod'>
    accountEntries: { [address: string]: nt.AssetsList }
    storedKeys: { [publicKey: string]: nt.KeyStoreEntry }
    checkPassword: (password: nt.KeyPassword) => Promise<boolean>
    onSubmit: (password: nt.KeyPassword) => void
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
    const { origin } = approval
    const { publicKey, recipient, payload } = approval.requestData

    const [inProcess, setInProcess] = React.useState(false)
    const [error, setError] = React.useState<string>()
    const [passwordModalVisible, setPasswordModalVisible] = React.useState(false)

    const account = window.ObjectExt.values(accountEntries).find(
        (account) => account.tonWallet.publicKey == publicKey
    )
    if (account == null) {
        !inProcess && onReject()
        setInProcess(true)
        return null
    }

    const trySubmit = async (password: string) => {
        const keyEntry = storedKeys[publicKey]
        if (keyEntry == null) {
            setError('Key entry not found')
            return
        }

        setInProcess(true)
        try {
            const keyPassword = prepareKey(keyEntry, password)
            const isValid = await checkPassword(keyPassword)
            if (isValid) {
                onSubmit(keyPassword)
            } else {
                setError('Invalid password')
            }
        } catch (e: any) {
            setError(parseError(e))
        } finally {
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
            <Approval account={account} title="Contract interaction" origin={origin}>
                <div className="approval__wrapper">
                    <div className="approval__spend-details">
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">Contract</span>
                            <span className="approval__spend-details-param-value">{recipient}</span>
                        </div>
                        {payload && (
                            <div className="approval__spend-details-param">
                                <span className="approval__spend-details-param-desc">Data</span>
                                <div className="approval__spend-details-param-data">
                                    <div className="approval__spend-details-param-data__method">
                                        <span>Method:</span>
                                        <span>{payload.method}</span>
                                    </div>
                                    {iterateItems(payload.params)}
                                </div>
                            </div>
                        )}
                    </div>

                    <footer className="approval__footer">
                        <Button type="button" white text="Reject" onClick={onReject} />
                        <Button
                            type="submit"
                            text="Send"
                            onClick={() => {
                                setPasswordModalVisible(true)
                            }}
                        />
                    </footer>
                </div>
            </Approval>
            <SlidingPanel
                isOpen={passwordModalVisible}
                onClose={() => setPasswordModalVisible(false)}
            >
                <EnterPassword
                    disabled={inProcess}
                    error={error}
                    handleNext={trySubmit}
                    handleBack={() => setPasswordModalVisible(false)}
                />
            </SlidingPanel>
        </>
    )
}
