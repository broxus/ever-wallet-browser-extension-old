import * as React from 'react'
import classNames from 'classnames'
import QRCode from 'react-qr-code'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import { CopyText } from '@popup/components/CopyText'
import Input from '@popup/components/Input'
import { Switcher } from '@popup/components/Switcher'
import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import { useDrawerPanel } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { closeCurrentWindow, useRpcState } from '@popup/providers/RpcStateProvider'

import Arrow from '@popup/img/arrow.svg'
import TonKey from '@popup/img/ton-key.svg'


export function ManageAccount(): JSX.Element {
    const accountability = useAccountability()
    const drawer = useDrawerPanel()
    const rpc = useRpc()
    const rpcState = useRpcState()

    const [name, setName] = React.useState(accountability.currentAccount?.name || '')

    const isVisible = React.useMemo(() => {
        if (accountability.currentAccount) {
            return accountability.accountsVisibility[
                accountability.currentAccount.tonWallet.address
            ]
        }
        return false
    }, [accountability.accountsVisibility])

    const isActive = React.useMemo(
        () =>
            accountability.currentAccount?.tonWallet.address
            === accountability.selectedAccount?.tonWallet.address,
        [
            accountability.currentAccount?.tonWallet.address,
            accountability.selectedAccount?.tonWallet.address,
        ]
    )

    const linkedKeys = React.useMemo(() => {
        const keys = window.ObjectExt.values({ ...rpcState.state.storedKeys }).filter(
            (key) => key.publicKey === accountability.currentAccount?.tonWallet.publicKey
        )

        const externalAccount = rpcState.state.externalAccounts.find(
            ({ address }) => address === accountability.currentAccount?.tonWallet.address
        )

		if (externalAccount !== undefined) {
            keys.push(
                ...externalAccount.externalIn.map(
                    (key) => rpcState.state.storedKeys[key]
                ).filter((e) => e)
            )
		}

        return keys
    }, [rpcState.state.storedKeys])

    const saveName = async () => {
        if (accountability.currentAccount !== undefined && name) {
            await rpc.renameAccount(accountability.currentAccount.tonWallet.address, name)
            accountability.setCurrentAccount({ ...accountability.currentAccount, name })
        }
    }

    const onSelectAccount = async () => {

        if (accountability.currentMasterKey?.masterKey == null) { return }

        await rpc.selectMasterKey(accountability.currentMasterKey.masterKey)
        if (accountability.currentAccount == null) { return }

        await rpc.updateAccountVisibility(accountability.currentAccount.tonWallet.address, true)
        await rpc.selectAccount(accountability.currentAccount.tonWallet.address)

        drawer.setPanel(undefined)
        accountability.reset()

        if (rpcState.activeTab?.type === 'notification') { closeCurrentWindow() }
    }

    const onManageDerivedKey = (key: nt.KeyStoreEntry) => {
        return () => accountability.onManageDerivedKey(key)
    }

    const onToggleVisibility = () => {
        if (accountability.currentAccount && !isActive) {
            rpc.updateAccountVisibility(accountability.currentAccount.tonWallet.address, !isVisible)
        }
    }

    const onBack = () => {
        accountability.setStep(Step.MANAGE_DERIVED_KEY)
        accountability.setCurrentAccount(undefined)
    }

    return (
        <div className="accounts-management__content">
            <h2 className="accounts-management__content-title">Manage account</h2>

            <div className="accounts-management__content-header">Account name</div>
            <div className="accounts-management__name-field">
                <Input
                    name="seed_name"
                    label="Enter key name"
                    type="text"
                    value={name || ''}
                    onChange={setName}
                />

                {(
                    accountability.currentAccount !== undefined
                    && (accountability.currentAccount.name !== undefined || name)
                    && accountability.currentAccount.name !== name
                ) && (
                        <a
                            role="button"
                            className="accounts-management__name-button"
                            onClick={saveName}
                        >
                            Save
                        </a>
                    )}
            </div>

            <div
                className={classNames('accounts-management__account-visibility', {
                    'accounts-management__account-visibility-disabled': isActive,
                })}
            >
                <Switcher id="visibility" checked={isVisible} onChange={onToggleVisibility} />
                <label htmlFor="visibility">Display on the main screen</label>
            </div>

            {accountability.currentAccount !== undefined && (
                <div className="accounts-management__address-placeholder">
                    <div className="accounts-management__address-qr-code">
                        <QRCode
                            value={`ton://chat/${accountability.currentAccount.tonWallet.address}`}
                            size={80}
                        />
                    </div>
                    <div>
                        <div className="accounts-management__address-text">
                            <CopyText text={accountability.currentAccount.tonWallet.address} />
                        </div>
                    </div>
                </div>
            )}

            {linkedKeys.length > 0 && (
                <>
                    <div className="accounts-management__content-header">Linked keys</div>
                    <div className="accounts-management__divider" />
                    <ul className="accounts-management__list">
                        {linkedKeys.map((key) => (
                            <li key={key.publicKey}>
                                <div
                                    role="button"
                                    className="accounts-management__list-item"
                                    onClick={onManageDerivedKey(key)}
                                >
                                    <img
                                        src={TonKey}
                                        alt=""
                                        className="accounts-management__list-item-logo"
                                    />
                                    <div className="accounts-management__list-item-title">
                                        {key.name}
                                    </div>
                                    <img src={Arrow} alt="" style={{ height: 24, width: 24 }} />
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <div className="accounts-management__content-buttons">
                <div className="accounts-management__content-buttons-back-btn">
                    <Button text="Back" white onClick={onBack} />
                </div>
                <Button text="Go to account" onClick={onSelectAccount} />
            </div>
        </div>
    )
}
