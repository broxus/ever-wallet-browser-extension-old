import React, { useState } from 'react'
import cn from 'classnames'
import { useForm } from 'react-hook-form'

import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import Tumbler from '@popup/components/Tumbler'

import TonLogo from '@popup/img/ton-logo.svg'

import './style.scss'

type PredefinedToken = {
    name: string
    symbol: string
    logo: () => JSX.Element
}

const PREDEFINED_TOKENS: { [K in string]: PredefinedToken } = {
    usdc: {
        name: 'USD Coin',
        symbol: 'USDC',
        logo: () => {
            // @ts-ignore
            return <TonLogo className="assets-list-item__logo" />
        },
    },
    another: {
        name: 'USDT Coin',
        symbol: 'USDT',
        logo: () => {
            // @ts-ignore
            return <TonLogo className="assets-list-item__logo" />
        },
    },
}

interface IToken {
    logo: () => JSX.Element
    name: string
    symbol: string
    enabled: boolean
    onToggle: (enabled: boolean) => void
}

export const Token: React.FC<IToken> = ({ logo, name, symbol, enabled, onToggle }) => {
    return (
        <div className="assets-list-item">
            <div style={{ display: 'flex' }}>
                {logo()}
                <div className="assets-list-item__balance">
                    <span className="assets-list-item__balance__amount">{name}</span>
                    <span className="assets-list-item__balance__dollars">{symbol}</span>
                </div>
            </div>
            <Tumbler checked={enabled} onChange={onToggle} />
        </div>
    )
}

type ISearchToken = {
    tokens: { [K in string]: PredefinedToken }
    onBack: () => void
}

const SearchToken: React.FC<ISearchToken> = ({ tokens, onBack }) => {
    const [enabledTokens, setEnabledTokens] = useState<string[]>([])
    const { register, handleSubmit, errors } = useForm()

    const onSubmit = async () => {
        console.log('submitted')
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Input
                label={'Enter token name...'}
                className="add-new-token__search-form"
                type="text"
                name="name"
                register={register({
                    required: true,
                })}
            />
            {/*{errors.name && <div className="check-seed__content-error">This field is required</div>}*/}
            <div style={{ overflowY: 'scroll', maxHeight: '320px', paddingRight: '8px' }}>
                {window.ObjectExt.entries(tokens).map(([id, token]) => {
                    const makeOnToggle = (id: string) => (enabled: boolean) => {
                        if (enabled) {
                            setEnabledTokens([...enabledTokens, id])
                        } else {
                            setEnabledTokens(enabledTokens.filter((item) => item != id))
                        }
                    }

                    return (
                        <Token
                            key={id}
                            {...token}
                            enabled={enabledTokens.includes(id)}
                            onToggle={makeOnToggle(id)}
                        />
                    )
                })}
            </div>
            <div style={{ display: 'flex' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button text={'Back'} onClick={onBack} white />
                </div>
                <Button text={'Select assets'} onClick={handleSubmit(onSubmit)} />
            </div>
        </form>
    )
}

type ICustomToken = {
    onBack: () => void
}

const CustomToken: React.FC<ICustomToken> = ({ onBack }) => {
    const { register, handleSubmit, errors } = useForm()

    const onSubmit = async (data) => {
        console.log('custom token submitted')
        console.log('contractAddress', data.contractAddress)
        console.log('symbol', data.symbol)
        console.log('decimals', data.decimals)
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Input
                label={'Contract wallet address...'}
                className="add-new-token__search-form"
                type="text"
                name="contractAddress"
                register={register({
                    required: true,
                })}
            />
            {errors.contractAddrress && (
                <div className="check-seed__content-error">This field is required</div>
            )}

            <Input
                label={'Token symbol...'}
                name="symbol"
                type="text"
                register={register({
                    required: false,
                })}
            />
            <Input
                label={'Number of decimal places...'}
                name="decimals"
                className="add-new-token__custom-last-input"
                register={register({
                    validate: (decimals) => decimals <= 18,
                })}
            />
            {errors.decimals && (
                <div className="check-seed__content-error">Maximum number of decimals is 18</div>
            )}
            <div style={{ display: 'flex' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button text={'Back'} onClick={onBack} white />
                </div>
                <Button text={'Select assets'} type="submit" />
            </div>
        </form>
    )
}

interface IAddNewToken {
    onBack: () => void
}

enum Tab {
    PREDEFINED,
    CUSTOM,
}

const AddNewToken: React.FC<IAddNewToken> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState(Tab.PREDEFINED)

    return (
        <>
            <h2>Select new assets</h2>

            <div className="add-new-token">
                <div className="add-new-token__panel">
                    <div
                        className={cn('add-new-token__panel-tab', {
                            _active: activeTab == Tab.PREDEFINED,
                        })}
                        onClick={() => setActiveTab(Tab.PREDEFINED)}
                    >
                        Search
                    </div>
                    <div
                        className={cn('add-new-token__panel-tab', {
                            _active: activeTab == Tab.CUSTOM,
                        })}
                        onClick={() => setActiveTab(Tab.CUSTOM)}
                    >
                        Custom token
                    </div>
                </div>
                {activeTab == Tab.PREDEFINED && (
                    <SearchToken onBack={onBack} tokens={PREDEFINED_TOKENS} />
                )}
                {activeTab == Tab.CUSTOM && <CustomToken onBack={onBack} />}
            </div>
        </>
    )
}

export default AddNewToken
