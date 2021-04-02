import React, {Dispatch, SetStateAction, useState} from 'react'
import { Button } from '../button'
import cn from 'classnames'
import Input from '../Input/Input'

import TonLogo from '../../img/ton-logo.svg'
import Tumbler from '../Tumbler/Tumbler'
import './add-new-token.scss'

export const Token = () => {
    const [checked, setChecked] = useState(false)
    return (
        <div className="main-page__user-assets-asset">
            <div style={{ display: 'flex' }}>
                {/*// @ts-ignore*/}
                <TonLogo style={{ marginRight: '16px', minWidth: '40px' }} />
                <div className="main-page__user-assets-asset-number">
                    <span className="main-page__user-assets-asset-number-amount">USD Coin</span>
                    <span className="main-page__user-assets-asset-number-dollars">USDC</span>
                </div>
            </div>
            <Tumbler checked={checked} onChange={() => setChecked(!checked)} />
        </div>
    )
}

const SearchToken: React.FC<IAddNewToken> = ({ onReturn }) => {
    return (
        <>
            <Input label={'Enter new account name...'} className="add-new-token__search-form" />
            <div style={{ overflowY: 'scroll', maxHeight: '320px', paddingRight: '8px' }}>
                <Token />
                <Token />
                <Token />
                <Token />
                <Token />
            </div>
            <div style={{ display: 'flex' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button text={'Back'} onClick={onReturn} white />
                </div>
                <Button text={'Select assets'} />
            </div>
        </>
    )
}
const CustomToken: React.FC<IAddNewToken> = ({ onReturn }) => {
    return (
        <>
            <Input label={'Contract wallet address...'} />
            <Input label={'Token symbol...'} />
            <Input
                label={'Number of decimal places...'}
                className="add-new-token__custom-last-input"
            />
            <div style={{ display: 'flex' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button text={'Back'} onClick={onReturn} white />
                </div>
                <Button text={'Select assets'} />
            </div>
        </>
    )
}

interface IAddNewToken {
    onReturn: Dispatch<SetStateAction<boolean>>
}

const AddNewToken: React.FC<IAddNewToken> = ({ onReturn }) => {
    const [activeTab, setActiveTab] = useState(0)
    const content = [<SearchToken onReturn={onReturn} />, <CustomToken onReturn={onReturn} />]
    return (
        <>
            <h2>Select new assets</h2>

            <div className="add-new-token">
                <div className="add-new-token__panel">
                    <div
                        className={cn('add-new-token__panel-tab', {
                            _active: activeTab === 0,
                        })}
                        onClick={() => setActiveTab(0)}
                    >
                        Search
                    </div>
                    <div
                        className={cn('add-new-token__panel-tab', {
                            _active: activeTab === 1,
                        })}
                        onClick={() => setActiveTab(1)}
                    >
                        Custom token
                    </div>
                </div>
                {content[activeTab]}
            </div>
        </>
    )
}

export default AddNewToken
