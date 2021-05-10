import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { useForm } from 'react-hook-form'
import cn from 'classnames'
import { AppState, StoreAction, TokensManifest, TokensManifestItem } from '@popup/store/app/types'
import { fetchManifest } from '@popup/store/app/actions'

import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import Tumbler from '@popup/components/Tumbler'

import Loader from '@popup/components/Loader'
import UserAvatar from '@popup/components/UserAvatar'

import './style.scss'

type NewToken = { rootTokenContract: string }

interface IToken {
    token: TokensManifestItem
    enabled?: boolean
    onToggle?: (enabled: boolean) => void
}

export const Token: React.FC<IToken> = ({ token, enabled, onToggle }) => {
    const { name, symbol, address, logoURI } = token

    return (
        <div className="assets-list-item">
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                {logoURI && (
                    <img
                        src={logoURI}
                        alt=""
                        height="36px"
                        width="36px"
                        className="assets-list-item__icon"
                    />
                )}
                {!logoURI && <UserAvatar address={address} className="assets-list-item__icon" />}
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
    tokens: TokensManifestItem[]
    onBack: () => void
    onNext: (tokens: string[]) => void
}

enum SelectTokenStep {
    SELECT,
    CONFIRM,
}

const SearchToken: React.FC<ISearchToken> = ({ tokens, onBack, onNext }) => {
    const [enabledTokens, setEnabledTokens] = useState<string[]>([])

    return (
        <form>
            <div style={{ overflowY: 'scroll', maxHeight: '320px', paddingRight: '8px' }}>
                {tokens.map((token) => {
                    const makeOnToggle = (address: string) => (enabled: boolean) => {
                        if (enabled) {
                            setEnabledTokens([...enabledTokens, address])
                        } else {
                            setEnabledTokens(enabledTokens.filter((item) => item !== address))
                        }
                    }

                    return (
                        <Token
                            key={token.address}
                            token={token}
                            enabled={enabledTokens.includes(token.address)}
                            onToggle={makeOnToggle(token.address)}
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
    tokensManifest: TokensManifest | undefined
    fetchManifest: StoreAction<typeof fetchManifest>
    onBack: () => void
}

enum Tab {
    PREDEFINED,
    CUSTOM,
}

const AddNewToken: React.FC<IAddNewToken> = ({ tokensManifest, fetchManifest, onBack }) => {
    const [activeTab, setActiveTab] = useState(Tab.PREDEFINED)
    const [step, setStep] = useState<SelectTokenStep>(SelectTokenStep.SELECT)
    const [selectedTokens, setSelectedTokens] = useState<string[]>([])

    useEffect(() => {
        fetchManifest().catch(console.error)
    }, [])

    const handleSelected = (tokens: string[]) => {
        setSelectedTokens(tokens)
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
                        {activeTab == Tab.PREDEFINED &&
                            ((tokensManifest?.tokens.length || 0) > 0 ? (
                                <SearchToken
                                    onBack={onBack}
                                    tokens={tokensManifest?.tokens || []}
                                    onNext={handleSelected}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Loader />
                                </div>
                            ))}
                        {activeTab == Tab.CUSTOM && (
                            <CustomToken onBack={onBack} onNext={() => {}} />
                        )}
                    </div>
                </>
            )}
            {step === SelectTokenStep.CONFIRM && (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <h2>Do you want to add these assets?</h2>
                    {(tokensManifest?.tokens || [])
                        .filter((item) => selectedTokens?.includes(item.address))
                        .map((token) => (
                            <Token key={token.address} token={token} />
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

const mapStateToProps = (store: { app: AppState }) => ({
    tokensManifest: store.app.tokensManifest,
})

export default connect(mapStateToProps, {
    fetchManifest,
})(AddNewToken)
