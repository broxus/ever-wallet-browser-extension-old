import React, { useEffect, useState } from 'react'
import cn from 'classnames'
import { useForm } from 'react-hook-form'

import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import Tumbler from '@popup/components/Tumbler'

import USDCLogo from '@popup/img/usdc-logo-s.svg'
import USDTLogo from '@popup/img/usdt-logo-s.svg'

import './style.scss'
import axios from 'axios'
import Loader from '@popup/components/Loader'

type PredefinedToken = {
    name: string
    symbol: string
    logo: () => JSX.Element
}

type IAvailableToken = {
    address: string
    name: string
    chainId: number
    decimals: number
    logoURI: string
    symbol: string
    version: number
}

const TOKEN_SCHEMA_URL = 'https://raw.githubusercontent.com/broxus/ton-assets/master/manifest.json'

const PREDEFINED_TOKENS: { [K in string]: PredefinedToken } = {
    usdc: {
        name: 'USD Coin',
        symbol: 'USDC',
        logo: () => {
            // @ts-ignore
            return <USDCLogo className="assets-list-item__logo" />
        },
    },
    another: {
        name: 'USDT Coin',
        symbol: 'USDT',
        logo: () => {
            // @ts-ignore
            return <USDTLogo className="assets-list-item__logo" />
        },
    },
}

type NewToken = { rootTokenContract: string }

interface IToken {
    logoURI: string
    name: string
    symbol: string
    enabled?: boolean
    onToggle?: (enabled: boolean) => void
}

export const Token: React.FC<IToken> = ({ logoURI, name, symbol, enabled, onToggle }) => {
    return (
        <div className="assets-list-item">
            <div style={{ display: 'flex' }}>
                {logoURI && (
                    <img
                        src={logoURI}
                        alt=""
                        height="36px"
                        width="36px"
                        className="assets-list-item__icon"
                    />
                )}
                <div className="assets-list-item__balance">
                    <span className="assets-list-item__balance__amount">{name}</span>
                    <span className="assets-list-item__balance__dollars">{symbol}</span>
                </div>
            </div>
            {onToggle && enabled !== undefined && (
                <Tumbler checked={enabled} onChange={onToggle} id={name} />
            )}
        </div>
    )
}

type ISearchToken = {
    tokens: IAvailableToken[]
    onBack: () => void
    onNext: (tokens: string[]) => void
}

enum SelectTokenStep {
    SELECT,
    CONFIRM,
}

const SearchToken: React.FC<ISearchToken> = ({ tokens, onBack, onNext }) => {
    const [enabledTokens, setEnabledTokens] = useState<string[]>([])

    const { register } = useForm()

    return (
        <form>
            {/*<Input*/}
            {/*    label={'Enter token name...'}*/}
            {/*    className="add-new-token__search-form"*/}
            {/*    type="text"*/}
            {/*    name="name"*/}
            {/*    register={register()}*/}
            {/*/>*/}
            {/*{errors.name && <div className="check-seed__content-error">This field is required</div>}*/}
            <div style={{ overflowY: 'scroll', maxHeight: '320px', paddingRight: '8px' }}>
                {tokens.map(({ symbol, logoURI, name, address }) => {
                    const makeOnToggle = (address: string) => (enabled: boolean) => {
                        if (enabled) {
                            setEnabledTokens([...enabledTokens, address])
                        } else {
                            setEnabledTokens(enabledTokens.filter((item) => item !== address))
                        }
                    }

                    return (
                        <Token
                            key={symbol}
                            symbol={symbol}
                            logoURI={logoURI}
                            name={name}
                            enabled={enabledTokens.includes(address)}
                            onToggle={makeOnToggle(address)}
                        />
                    )
                })}
            </div>
            <div style={{ display: 'flex', paddingTop: '16px' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button text={'Back'} onClick={onBack} white />
                </div>
                <Button
                    text={'Select assets'}
                    disabled={!enabledTokens.length}
                    onClick={() => onNext(enabledTokens)}
                />
            </div>
        </form>
    )
}

type ICustomToken = {
    onBack: () => void
    onNext: () => void
}

const CustomToken: React.FC<ICustomToken> = ({ onBack, onNext }) => {
    const { register, handleSubmit, errors } = useForm<NewToken>()

    const onSubmit = async (data: NewToken) => {
        console.log('custom token submitted')
        console.log('contractAddress', data.rootTokenContract)
        onNext()
    }

    return (
        <form>
            <Input
                label={'Root token contract...'}
                className="add-new-token__search-form"
                type="text"
                name="rootTokenContract"
                register={register({
                    required: true,
                })}
            />
            {errors.rootTokenContract && (
                <div className="check-seed__content-error">This field is required</div>
            )}
            <div style={{ display: 'flex', paddingTop: '16px' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button text={'Back'} onClick={onBack} white />
                </div>
                <Button text={'Proceed'} type="button" onClick={handleSubmit(onSubmit)} />
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
    const [availableTokens, setAvailableTokens] = useState<IAvailableToken[]>([])
    const [step, setStep] = useState<SelectTokenStep>(SelectTokenStep.SELECT)
    const [selectedTokens, setSekectedTokens] = useState<string[]>()

    useEffect(() => {
        axios.get(TOKEN_SCHEMA_URL).then((res) => {
            setAvailableTokens(res.data.tokens)
        })
    }, [])

    const handleSelected = (tokens: string[]) => {
        setSekectedTokens(tokens)
        setStep(SelectTokenStep.CONFIRM)
    }

    const handleSubmit = () => {
        console.log('selected tokens: ', selectedTokens)
    }

    return (
        <>
            {step === SelectTokenStep.SELECT && (
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
                        {availableTokens.length === 0 && (
                            <div
                                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                            >
                                <Loader />
                            </div>
                        )}
                        {activeTab == Tab.PREDEFINED && (
                            <SearchToken
                                onBack={onBack}
                                tokens={availableTokens}
                                onNext={handleSelected}
                            />
                        )}
                        {activeTab == Tab.CUSTOM && (
                            <CustomToken onBack={onBack} onNext={() => {}} />
                        )}
                    </div>
                </>
            )}
            {step === SelectTokenStep.CONFIRM && (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <h2>Do you want to add these assets?</h2>
                    {availableTokens
                        .filter((item) => selectedTokens?.includes(item.address))
                        .map(({ name, logoURI, symbol }) => (
                            <Token key={symbol} name={name} logoURI={logoURI} symbol={symbol} />
                        ))}
                    <div style={{ display: 'flex', paddingTop: '16px' }}>
                        <div style={{ width: '50%', marginRight: '12px' }}>
                            <Button
                                text={'Back'}
                                onClick={() => setStep(SelectTokenStep.SELECT)}
                                white
                            />
                        </div>
                        <Button text={'Yes, add selected assets'} onClick={() => handleSubmit()} />
                    </div>
                </div>
            )}
        </>
    )
}

export default AddNewToken
