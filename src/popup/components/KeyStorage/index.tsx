import React, { useState } from 'react'

import Modal from '@popup/components/Modal'
import Button from '@popup/components/Button'

import ThreeDots from '@popup/img/three-dots.svg'

import './style.scss'

interface IKeyStorage {
    createdKey?: any
    publicKey?: any
}

const KeyStorage: React.FC<IKeyStorage> = ({ createdKey, publicKey }) => {
    const [modalOpen, setModalOpen] = useState(false)
    const [panelOpen, setPanelOpen] = useState(false)

    const exportSeedPhrase = () => {
        setPanelOpen(true)
        //setActiveContent(4)
    }

    const savePrivateKey = () => {
        const element = document.createElement('a')
        // @ts-ignore
        const file = new Blob([publicKey], {
            type: 'text/plain;charset=utf-8',
        })
        element.href = URL.createObjectURL(file)
        element.download = `nekoton-private-key`
        document.body.appendChild(element)
        element.click()
        setModalOpen(false)
    }

    return (
        <>
            <div className="key-storage">
                <div>
                    <h2 className="key-storage__title">Key storage</h2>
                    {createdKey && (
                        <div className="key-storage__key">
                            <div className="key-storage__key-text-block">
                                <h3 className="key-storage__key-text-block-header">Key name 1</h3>
                                <div className="key-storage__key-text-block-key">{publicKey}</div>
                                <div
                                    className="main-page__account-settings-section-item"
                                    style={{
                                        display: 'flex',
                                        paddingBottom: '18px',
                                        marginBottom: '16px',
                                        borderBottom: '1px solid #ebedee',
                                    }}
                                >
                                    {/*<UserAvatar address={account} />*/}
                                    <div style={{ padding: '0 12px' }}>
                                        <div className="key-storage__key-text-block-account">
                                            Account 1 (Wallet V3)
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="key-storage__key-ellipsis"
                                onClick={() => setModalOpen(true)}
                            >
                                <ThreeDots />
                                {modalOpen && (
                                    <Modal onClose={() => setModalOpen(false)}>
                                        <div
                                            className="key-storage__key-modal-content"
                                            onClick={() => exportSeedPhrase()}
                                        >
                                            Export seed phrase
                                        </div>
                                        <div
                                            className="key-storage__key-modal-content"
                                            onClick={() => savePrivateKey()}
                                        >
                                            Export private key
                                        </div>
                                    </Modal>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <Button text={'Add key'} />
            </div>
            {/*<SlidingPanel isOpen={panelOpen} setIsOpen={setPanelOpen}>*/}
            {/*    /!*<EnterPassword setStep={() => {}} />*!/*/}
            {/*    <></>*/}
            {/*</SlidingPanel>*/}
        </>
    )
}

export default KeyStorage
