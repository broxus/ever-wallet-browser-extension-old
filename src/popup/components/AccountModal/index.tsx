import React, { useRef } from 'react'
import { convertTons } from '@utils'
import { hideModalOnClick } from '@common'
import * as nt from '@nekoton'

import UserPicS from '@img/user-avatar-placeholder-s.svg'
import './style.scss'

type IAccountModal = {
    account: nt.AssetsList
    tonWalletState: nt.AccountState | null
    onOpenConnectedSites?: () => void
    onCreateAccount?: () => void
    onOpenKeyStore?: () => void
    onOpenWalletSettings?: () => void
    onOpenInformation?: () => void
    onLogOut: () => void
    onClose: () => void
}

const AccountModal: React.FC<IAccountModal> = ({
    account,
    tonWalletState,
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

    return (
        <Wrapper>
            <div className="account-settings-section">
                <div className="account-settings-section-item" style={{ display: 'flex' }}>
                    <UserPicS />
                    <div style={{ padding: '0 12px' }}>
                        <div className="account-settings-section-account">{account.name}</div>
                        <div className="account-settings-section-item-value">
                            {`${convertTons(tonWalletState?.balance || '0')} TON`}
                        </div>
                        {/*<div onClick={() => onOpenConnectedSites?.()}>Connected sites</div>*/}
                    </div>
                </div>
                {/*<div className="account-settings-section-item">Other seeds</div>*/}
                {/*<div className="account-settings-section-item">Add seed</div>*/}
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
        </Wrapper>
    )
}

export default AccountModal
