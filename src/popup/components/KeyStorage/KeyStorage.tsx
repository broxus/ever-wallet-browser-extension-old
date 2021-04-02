import React, { useEffect } from 'react'
import './key-storage.scss'
import { Button } from '../button'
import { AppState } from '../../store/app/types'
import { connect } from 'react-redux'
import { addKey, createKey, generateSeedPhrase, restoreKey } from '../../store/app/actions'
import { GeneratedMnemonic } from '../../../nekoton/pkg'

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

    useEffect(() => {
        console.log('tt')
        console.log('accountType.data', accountType.data)
        console.log('seed', seed)
    }, [seed, accountType])

    return (
        <>
            <h2 className="send-screen__form-title">Key storage</h2>
            <h3>Key name 1</h3>
            <Button text={'Add key'} />
        </>
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
