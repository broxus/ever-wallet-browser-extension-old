import React, { useEffect, useRef } from 'react'
import UserPicS from '../../img/user-avatar-placeholder-s.svg'
import Plus from '../../img/plus.svg'
import { connect } from 'react-redux'
import { resetAccounts } from '../../store/app/actions'

const AccountModal: React.FC<any> = ({
    setActiveContent,
    setPanelVisible,
    setModalVisible,
    resetAccounts,
}) => {
    const hideModalOnClick = (ref: React.MutableRefObject<null>) => {
        const handleClickOutside = (event: { target: any }) => {
            // @ts-ignore
            if (ref.current && !ref.current.contains(event.target)) {
                setModalVisible(false)
            }
        }
        useEffect(() => {
            document.addEventListener('mousedown', handleClickOutside)
            return () => {
                document.removeEventListener('mousedown', handleClickOutside)
            }
        })
    }

    const Wrapper = (props: any) => {
        const wrapperRef = useRef(null)
        hideModalOnClick(wrapperRef)
        return (
            <div ref={wrapperRef} className="main-page__account-settings noselect">
                {props.children}
            </div>
        )
    }

    const navigate = (step: number) => {
        setPanelVisible(true)
        setModalVisible(false)
        setActiveContent(step)
    }

    return (
        <Wrapper>
            <div className="main-page__account-settings-section">
                <div
                    className="main-page__account-settings-section-item"
                    style={{ display: 'flex' }}
                >
                    <UserPicS />
                    <div style={{ padding: '0 12px' }}>
                        <div className="main-page__account-settings-section-account">Account 1</div>
                        <div className="main-page__account-settings-section-item-value">
                            $1,200.00
                        </div>
                        <div>Connected sites</div>
                    </div>
                </div>
            </div>
            <div className="main-page__account-settings-separator" />
            <div className="main-page__account-settings-section">
                <div
                    className="main-page__account-settings-section-item"
                    style={{ display: 'flex' }}
                    onClick={() => navigate(3)}
                >
                    <Plus />
                    <div style={{ padding: '0 12px' }}>Create account</div>
                </div>
            </div>
            <div className="main-page__account-settings-separator" />
            <div className="main-page__account-settings-section">
                <div
                    className="main-page__account-settings-section-item"
                    onClick={() => navigate(2)}
                >
                    Key storage
                </div>
                <div className="main-page__account-settings-section-item">Wallet settings</div>
                <div className="main-page__account-settings-section-item">Information and help</div>
            </div>
            <div className="main-page__account-settings-separator" />
            <div
                className="main-page__account-settings-section-item-log-out"
                onClick={() => resetAccounts()}
            >
                Log out
            </div>
        </Wrapper>
    )
}

export default connect(null, {
    resetAccounts,
})(AccountModal)
