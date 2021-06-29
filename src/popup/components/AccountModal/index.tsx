import { ControllerState } from '@popup/utils/ControllerRpcClient'
import React, { useMemo, useRef } from 'react'
import { convertAddress, convertTons } from '@shared/utils'
import { hideModalOnClick } from '@popup/common'
import * as nt from '@nekoton'

import './style.scss'

import manifest from '../../../manifest.json'

type IAccountModal = {
    tonWalletState: nt.ContractState | undefined
    controllerState: ControllerState
    onOpenConnectedSites?: () => void
    onCreateAccount?: () => void
    onManageSeed?: () => void
    onOpenKeyStore?: () => void
    onOpenWalletSettings?: () => void
    onOpenInformation?: () => void
    onLogOut: () => void
    onClose: () => void
}

const AccountModal: React.FC<IAccountModal> = ({
    // tonWalletState,
    controllerState,
    onManageSeed,
    //onOpenConnectedSites,
    //onOpenKeyStore,
    //onOpenWalletSettings,
    //onOpenInformation,
    onLogOut,
    onClose,
}) => {
    const Wrapper = (props: any) => {
        const wrapperRef = useRef(null)
        hideModalOnClick(wrapperRef, onClose)
        return (
            <div ref={wrapperRef} className="account-settings noselect">
                {props.children}
            </div>
        )
    }

    const selectedSeedName = useMemo(() => {
        if (controllerState.selectedAccount?.tonWallet.publicKey !== undefined) {
            const seedMasterKey = controllerState.storedKeys[controllerState.selectedAccount?.tonWallet.publicKey].masterKey
            return controllerState.seedsNames[seedMasterKey]
        }
        return undefined
    }, [controllerState.selectedAccount, controllerState.seedsNames])

    const seeds = useMemo(() => Object.values(controllerState.storedKeys).filter(
        key => key.accountId === 0
    ), [controllerState.storedKeys])

    return (
        <Wrapper>
            <div className="account-settings-section">
                <div className="account-settings-section-header">
                    Current seed ({selectedSeedName})
                </div>
                {/*<div className="account-settings-section-item">*/}
                {/*    <div style={{ padding: '0 12px' }}>*/}
                {/*        <div className="account-settings-section-account">{account.name}</div>*/}
                {/*        <div className="account-settings-section-item-value">*/}
                {/*            {`${convertTons(tonWalletState?.balance || '0')} TON`}*/}
                {/*        </div>*/}
                {/*        <div onClick={() => onOpenConnectedSites?.()}>Connected sites</div>*/}
                {/*    </div>*/}
                {/*</div>*/}
                {/*<div className="account-settings-section-item">Other seeds</div>*/}
            </div>

            <div className="account-settings-separator" />

            <div className="account-settings-section">
                <div className="account-settings-section-header">
                    All seeds
                </div>

                <ul className="account-settings__seeds-list">
                    {seeds.map(seed => (
                        <li key={seed.masterKey}>
                            <a
                                role="button"
                                className="account-settings__seeds-list-item"
                                onClick={() => {

                                }}
                            >
                                <div className="account-settings__seeds-list-item-title">
                                    {controllerState.seedsNames?.[seed.masterKey] || convertAddress(seed.masterKey)}
                                </div>
                            </a>
                        </li>
                    ))}
                </ul>

                <div
                    className="account-settings-section-item"
                    onClick={() => onManageSeed?.()}
                >
                    Manage seeds & accounts
                </div>
            </div>
            {/*<div className="account-settings-separator" />*/}
            {/*<div className="account-settings-section">*/}
            {/*    <div*/}
            {/*        className="account-settings-section-item"*/}
            {/*        style={{ display: 'flex' }}*/}
            {/*        onClick={() => onCreateAccount?.()}*/}
            {/*    >*/}
            {/*        <Plus />*/}
            {/*        <div style={{ padding: '0 12px' }}>Create account</div>*/}
            {/*    </div>*/}
            {/*</div>*/}
            <div className="account-settings-separator" />
            {/*<div className="account-settings-section">*/}
            {/*    <div className="account-settings-section-item" onClick={() => onOpenKeyStore?.()}>*/}
            {/*        Seeds preferences*/}
            {/*    </div>*/}
            {/*    <div className="account-settings-section-item" onClick={() => onOpenKeyStore?.()}>*/}
            {/*        Key storage*/}
            {/*    </div>*/}
            {/*    <div*/}
            {/*        className="account-settings-section-item"*/}
            {/*        onClick={() => onOpenWalletSettings?.()}*/}
            {/*    >*/}
            {/*        Wallet settings*/}
            {/*    </div>*/}
            {/*    <div*/}
            {/*        className="account-settings-section-item"*/}
            {/*        onClick={() => onOpenInformation?.()}*/}
            {/*    >*/}
            {/*        Information and help*/}
            {/*    </div>*/}
            {/*</div>*/}
            {/*<div className="account-settings-separator" />*/}
            <div className="account-settings-section-item-log-out" onClick={() => onLogOut()}>
                Log out
            </div>
            <div className="account-settings-section-item-version">
                Version: {(manifest as any).version}
            </div>
        </Wrapper>
    )
}

export default AccountModal
