import React, { Dispatch, SetStateAction, useState } from 'react'
import _ from 'lodash'
import { Button } from '../button'
import cn from 'classnames'
import Input from '../Input/Input'

import TonLogo from '../../img/ton-logo.svg'
import Tumbler from '../Tumbler/Tumbler'
import './add-new-token.scss'
import { useForm } from 'react-hook-form'

interface IToken {
    checked: boolean
    handleChange: (id: any) => void
    id: any
}
export const Token: React.FC<IToken> = ({ checked, handleChange, id }) => {
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
            <Tumbler checked={checked} onChange={() => handleChange(id)} />
        </div>
    )
}

const SearchToken: React.FC<IAddNewToken> = ({ onReturn }) => {
    const [checked, setChecked] = useState({ 1: false, 2: false, 3: false, 4: false, 5: false })
    const { register, handleSubmit, errors, watch, getValues } = useForm()

    const onSubmit = async () => {
        console.log('submitted')
    }

    const handleChange = (id: number) => {
        const copy = _.cloneDeep(checked)
        copy[id] = !checked[id]
        setChecked(copy)
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Input
                label={'Enter new account name...'}
                className="add-new-token__search-form"
                type="text"
                name="name"
                register={register({
                    required: true,
                })}
            />
            {errors.name && <div className="check-seed__content-error">This field is required</div>}
            <div style={{ overflowY: 'scroll', maxHeight: '320px', paddingRight: '8px' }}>
                <Token checked={checked['1']} handleChange={handleChange} id={1} />
                <Token checked={checked['2']} handleChange={handleChange} id={2} />
                <Token checked={checked['3']} handleChange={handleChange} id={3} />
                <Token checked={checked['4']} handleChange={handleChange} id={4} />
                <Token checked={checked['5']} handleChange={handleChange} id={5} />
            </div>
            <div style={{ display: 'flex' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button text={'Back'} onClick={onReturn} white />
                </div>
                <Button text={'Select assets'} type="submit" />
            </div>
        </form>
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
