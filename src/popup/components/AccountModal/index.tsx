import * as React from 'react'

import manifest from '../../../manifest.json'

import { hideModalOnClick } from '@popup/common'
import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import { Panel, useDrawerPanel } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { getScrollWidth } from '@popup/utils/getScrollWidth'

import Profile from '@popup/img/profile.svg'

import { convertAddress } from '@shared/utils'

import './style.scss'
import * as nt from '@nekoton'

export function AccountModal() {
    const accountability = useAccountability()
    const rpcState = useRpcState()
    const drawer = useDrawerPanel()
    const rpc = useRpc()

    const iconRef = React.useRef(null)
    const wrapperRef = React.useRef(null)

    const [isActive, setActiveTo] = React.useState(false)

    const scrollWidth = React.useMemo(() => getScrollWidth(), [])

    const selectedSeedName = React.useMemo(() => {
        if (accountability.selectedMasterKey !== undefined) {
            return (
                accountability.masterKeysNames[accountability.selectedMasterKey] ||
                convertAddress(accountability.selectedMasterKey)
            )
        }
        return undefined
    }, [accountability.masterKeysNames, accountability.selectedMasterKey])

    const hide = () => {
        setActiveTo(false)
    }

    const toggle = () => {
        setActiveTo(!isActive)
    }

    const onSelectMaster = (masterKey: string) => {
        return async () => {
            const key = accountability.masterKeys.find((entry) => entry.masterKey === masterKey)
            if (key == null) {
                return
            }

            hide()

            if (key.masterKey === accountability.selectedMasterKey) {
                return
            }

            const derivedKeys = window.ObjectExt.values(rpcState.state.storedKeys)
                .filter((item) => item.masterKey === key.masterKey)
                .map((item) => item.publicKey)

            const availableAccounts: { [address: string]: nt.AssetsList } = {}

            window.ObjectExt.values(rpcState.state.accountEntries).forEach((account) => {
                const address = account.tonWallet.address
                if (
                    derivedKeys.includes(account.tonWallet.publicKey) &&
                    rpcState.state.accountsVisibility[address]
                ) {
                    availableAccounts[address] = account
                }
            })

            rpcState.state.externalAccounts.forEach(({ address, externalIn }) => {
                derivedKeys.forEach((derivedKey) => {
                    if (externalIn.includes(derivedKey)) {
                        const account = rpcState.state.accountEntries[address] as
                            | nt.AssetsList
                            | undefined
                        if (account != null && rpcState.state.accountsVisibility[address]) {
                            availableAccounts[address] = account
                        }
                    }
                })
            })

            const accounts = window.ObjectExt.values(availableAccounts).sort((a, b) => {
                if (a.name < b.name) return -1
                if (a.name > b.name) return 1
                return 0
            })

            if (accounts.length == 0) {
                accountability.setCurrentMasterKey(key)
                accountability.setStep(Step.MANAGE_SEED)
                drawer.setPanel(Panel.MANAGE_SEEDS)
            } else {
                await rpc.selectMasterKey(key.masterKey)
                await rpc.selectAccount(accounts[0].tonWallet.address)
                drawer.setPanel(undefined)
            }
        }
    }

    const onManageSeeds = async () => {
        await rpc.openExtensionInExternalWindow({
            group: 'manage_seeds',
            width: 360 + scrollWidth - 1,
            height: 600 + scrollWidth - 1,
        })
    }

    hideModalOnClick(wrapperRef, iconRef, hide)

    return (
        <>
            <div className="account-details__profile-icon" onClick={toggle} ref={iconRef}>
                <img src={Profile} alt="" />
            </div>

            {isActive && (
                <div ref={wrapperRef} className="account-settings noselect">
                    <div className="account-settings-section">
                        <div className="account-settings-section-header">
                            Current seed {selectedSeedName !== undefined && `(${selectedSeedName})`}
                        </div>
                    </div>

                    <div className="account-settings-separator" />

                    <div className="account-settings-section">
                        <div className="account-settings-section-header">Recent seeds</div>

                        <ul className="account-settings__seeds-list">
                            {accountability.recentMasterKeys.map((key) => (
                                <li key={key.masterKey}>
                                    <a
                                        role="button"
                                        className="account-settings__seeds-list-item"
                                        onClick={onSelectMaster(key.masterKey)}
                                    >
                                        <div className="account-settings__seeds-list-item-title">
                                            {accountability.masterKeysNames?.[key.masterKey] ||
                                                convertAddress(key.masterKey)}
                                        </div>
                                    </a>
                                </li>
                            ))}
                        </ul>

                        <div className="account-settings-section-item" onClick={onManageSeeds}>
                            Manage seeds & accounts
                        </div>
                    </div>

                    <div className="account-settings-separator" />

                    <div
                        className="account-settings-section-item-log-out"
                        onClick={accountability.logOut}
                    >
                        Log out
                    </div>
                    <div className="account-settings-section-item-version">
                        Version: {(manifest as any).version}
                    </div>
                </div>
            )}
        </>
    )
}
