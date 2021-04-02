import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { Button } from '../button'
import { AppState } from '../../store/app/types'
import { addKey, createKey, generateSeedPhrase, restoreKey } from '../../store/app/actions'
import ThreeDots from '../../img/three-dots.svg'
import { GeneratedMnemonic } from '../../../../nekoton/pkg'
import './key-storage.scss'
import UserPicS from '../../img/user-avatar-placeholder-s.svg'
import { makeLogger } from 'ts-loader/dist/logger'

interface IKeyStorage {
    createKey?: (arg0: GeneratedMnemonic, arg1: string) => Promise<void>
    key?: any
    seed?: any
    accountType?: any
    publicKey?: any
    phrase: GeneratedMnemonic
    generateSeedPhrase?: any
}

const KeyStorage: React.FC<IKeyStorage> = ({ createKey, phrase, seed, accountType }) => {
    const [modalOpen, setModalOpen] = useState(false)
    const createKeyLocal = async () => {
        if (createKey) {
            await createKey(phrase, 'testpwd')
        }
    }

    let counter = 0
    useEffect(() => {
        console.log(phrase, 'phrase')
        // console.log(publicKey, 'publicKey')
        if (phrase && counter == 0) {
            createKeyLocal()
            counter = 1
        }
    }, [phrase])

    return (
        <div className="key-storage">
            <div>
                <h2 className="key-storage__title">Key storage</h2>
                <div className="key-storage__key">
                    <div className="key-storage__key-text-block">
                        <h3 className="key-storage__key-text-block-header">Key name 1</h3>
                        <div className="key-storage__key-text-block-key">
                            100771fa3b474e44cdff7e1721108e2916e5434d2442637992d066cea4338468
                        </div>

                        <div
                            className="main-page__account-settings-section-item"
                            style={{
                                display: 'flex',
                                paddingBottom: '18px',
                                marginBottom: '16px',
                                borderBottom: '1px solid #ebedee',
                            }}
                        >
                            <UserPicS />
                            <div style={{ padding: '0 12px' }}>
                                <div className="key-storage__key-text-block-account">
                                    Account 1 (Wallet V3)
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="key-storage__key-ellipsis" onClick={() => setModalOpen(true)}>
                        <ThreeDots />
                    </div>
                </div>
            </div>
            <Button text={'Add key'} />
        </div>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    key: store.app.key,
    phrase: store.app.phrase,
    seed: store.app.seed,
    accountType: store.app.accountType,
    // publicKey: store.app.publicKey,
})

export default connect(mapStateToProps, {
    createKey,
    addKey,
    restoreKey,
    generateSeedPhrase,
})(KeyStorage)
