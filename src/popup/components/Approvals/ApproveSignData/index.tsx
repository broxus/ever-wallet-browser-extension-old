import * as React from 'react'
import { parseError, prepareKey } from '@popup/utils'
import classNames from 'classnames'
import { PendingApproval } from '@shared/backgroundApi'
import * as nt from '@nekoton'

import Button from '@popup/components/Button'
import Approval from '../Approval'
import { EnterPassword } from '@popup/components/EnterPassword'
import SlidingPanel from '@popup/components/SlidingPanel'

import './style.scss'

enum DisplayType {
    Utf8,
    Hex,
    Base64,
}

const base64ToUtf8 = (str: string) => {
    try {
        return nt.base64ToUtf8Lossy(str)
    } catch (e: any) {
        return str
    }
}

const base64ToHex = (bytes: string) =>
    atob(bytes)
        .split('')
        .map((c) => ('0' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')

type Props = {
    approval: PendingApproval<'signData'>
    accountEntries: { [address: string]: nt.AssetsList }
    storedKeys: { [publicKey: string]: nt.KeyStoreEntry }
    checkPassword: (password: nt.KeyPassword) => Promise<boolean>
    onSubmit: (password: nt.KeyPassword, delayedDeletion: boolean) => void
    onReject: () => void
}

export function ApproveSignData({
    approval,
    accountEntries,
    storedKeys,
    checkPassword,
    onSubmit,
    onReject,
}: Props) {
    const { origin } = approval
    const { publicKey, data: rawData } = approval.requestData

    const [inProcess, setInProcess] = React.useState(false)
    const [error, setError] = React.useState<string>()
    const [passwordModalVisible, setPasswordModalVisible] = React.useState(false)
    const [displayType, setDisplayType] = React.useState(DisplayType.Base64)

    const keyEntry = storedKeys[publicKey]

    const account = window.ObjectExt.values(accountEntries).find(
        (account) => account.tonWallet.publicKey == publicKey
    )
    if (account == null) {
        !inProcess && onReject()
        setInProcess(true)
        return null
    }

    const trySubmit = async (password: string) => {
        if (keyEntry == null) {
            setError('Key entry not found')
            return
        }

        setInProcess(true)
        try {
            const keyPassword = prepareKey(keyEntry, password)
            const isValid = await checkPassword(keyPassword)
            if (isValid) {
                onSubmit(keyPassword, true)
            } else {
                setError('Invalid password')
            }
        } catch (e: any) {
            setError(parseError(e))
        } finally {
            setInProcess(false)
        }
    }

    let data: string = rawData
    if (displayType == DisplayType.Hex) {
        data = base64ToHex(rawData)
    } else if (displayType == DisplayType.Utf8) {
        data = base64ToUtf8(rawData)
    }

    const selectorItem = (type: DisplayType, name: string) => (
        <div
            key={name}
            className={classNames('item', { active: displayType == type })}
            onClick={() => setDisplayType(type)}
        >
            {name}
        </div>
    )

    return (
        <>
            <Approval
                account={account}
                title="Sign data"
                origin={origin}
                className={'approval--sign-data'}
            >
                <div className="approval__wrapper">
                    <div className="approval__spend-details">
                        <div className="approval__spend-details-param">
                            <div className="approval__spend-details-param-desc with-selector">
                                <span>Data</span>
                                <div className="selector noselect">
                                    {[
                                        selectorItem(DisplayType.Utf8, 'utf8'),
                                        selectorItem(DisplayType.Hex, 'hex'),
                                        selectorItem(DisplayType.Base64, 'base64'),
                                    ]}
                                </div>
                            </div>
                            <div className="approval__spend-details-param-data">{data}</div>
                        </div>
                    </div>

                    <footer className="approval__footer">
                        <Button type="button" white text="Reject" onClick={onReject} />
                        <Button
                            type="submit"
                            text="Sign"
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
                    keyEntry={keyEntry}
                    disabled={inProcess}
                    error={error}
                    handleNext={trySubmit}
                    handleBack={() => setPasswordModalVisible(false)}
                />
            </SlidingPanel>
        </>
    )
}
