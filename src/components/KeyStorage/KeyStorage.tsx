import React, { Dispatch, SetStateAction } from 'react'
import './key-storage.scss'
import { Button } from '../button'

interface IKeyStorage {}

const KeyStorage: React.FC<IKeyStorage> = () => {
    return (
        <>
            <h2 className="send-screen__form-title">Key storage</h2>
            <Button text={'Add key'} />
        </>
    )
}

export default KeyStorage
