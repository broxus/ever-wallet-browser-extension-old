import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { connect } from 'react-redux'
import { useForm } from 'react-hook-form'
import cn from 'classnames'
import { AppState, StoreAction, TokensManifest, TokensManifestItem } from '@popup/store/app/types'
import { TokenWalletsToUpdate } from '@shared/backgroundApi'
import { fetchManifest } from '@popup/store/app/actions'
import * as nt from '@nekoton'

import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import Tumbler from '@popup/components/Tumbler'
import AssetIcon from '@popup/components/AssetIcon'

import Loader from '@popup/components/Loader'

import './style.scss'
import { parseError } from '@popup/utils'

type NewToken = { rootTokenContract: string }

interface IToken {
    name: string
    fullName: string
    rootTokenContract: string
    enabled?: boolean
    old?: boolean
    onToggle?: (enabled: boolean) => void
}

export const Token: React.FC<IToken> = ({
    name,
    fullName,
    rootTokenContract,
    enabled,
    old,
    onToggle,
}) => {
    return (
        <div className="assets-list-item">
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <AssetIcon
                    type={'token_wallet'}
                    address={rootTokenContract}
                    old={old}
                    className="assets-list-item__icon noselect"
                />
                <div className="assets-list-item__balance">
                    <span className="assets-list-item__balance__amount">{name}</span>
                    <span className="assets-list-item__balance__dollars">{fullName}</span>
                </div>
            </div>
            {onToggle && enabled !== undefined && (
                <Tumbler checked={enabled} onChange={onToggle} id={rootTokenContract} />
            )}
        </div>
    )
}

type ISearchToken = {
    tokens: { name: string; fullName: string; rootTokenContract: string; old: boolean }[]
    existingTokens: TokenWalletsToUpdate
    disabled?: boolean
    onSubmit: (params: TokenWalletsToUpdate) => void
    onBack: () => void
}

const SearchToken: React.FC<ISearchToken> = ({
    tokens,
    existingTokens,
    disabled,
    onSubmit,
    onBack,
}) => {
    const intl = useIntl()
    const [result, setResult] = useState<TokenWalletsToUpdate>({})

    const hasChanges = Object.keys(result).length > 0

    return (
        <form>
            <div style={{ overflowY: 'scroll', maxHeight: '320px', paddingRight: '8px' }}>
                {tokens.map(({ name, fullName, rootTokenContract, old }) => {
                    const address = rootTokenContract

                    const existing = existingTokens[address] || false
                    const enabled = result[address] == null ? existing : result[address]

                    return (
                        <Token
                            key={address}
                            name={name}
                            fullName={fullName}
                            rootTokenContract={address}
                            enabled={enabled}
                            old={old}
                            onToggle={(enabled: boolean) => {
                                let newResult = { ...result }
                                if (!existing && enabled) {
                                    newResult[address] = true
                                } else if (existing && !enabled) {
                                    newResult[address] = false
                                } else {
                                    delete newResult[address]
                                }
                                setResult(newResult)
                            }}
                        />
                    )
                })}
            </div>
            <div style={{ display: 'flex', paddingTop: '16px' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button
                        text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                        onClick={onBack}
                        white
                    />
                </div>
                <Button
                    text={intl.formatMessage({ id: 'SAVE_BTN_TEXT' })}
                    disabled={disabled || !hasChanges}
                    onClick={() => onSubmit(result)}
                />
            </div>
        </form>
    )
}

type ICustomToken = {
    disabled?: boolean
    error?: string
    onSubmit: (params: TokenWalletsToUpdate) => void
    onBack: () => void
}

const CustomToken: React.FC<ICustomToken> = ({ disabled, error, onSubmit, onBack }) => {
    const intl = useIntl()
    const { register, handleSubmit, formState } = useForm<NewToken>()

    const trySubmit = async ({ rootTokenContract }: NewToken) => {
        onSubmit({
            [rootTokenContract]: true,
        })
    }

    return (
        <form>
            <Input
                label={intl.formatMessage({ id: 'ROOT_TOKEN_CONTRACT_FIELD_PLACEHOLDER' })}
                className="add-new-token__search-form"
                type="text"
                autocomplete="off"
                disabled={disabled}
                {...register('rootTokenContract', {
                    required: true,
                    pattern: /^(?:-1|0):[0-9a-fA-F]{64}$/,
                    validate: (value: string) => value != null && nt.checkAddress(value),
                })}
            />
            {error && <div className="check-seed__content-error">{error}</div>}
            {formState.errors.rootTokenContract && (
                <div className="check-seed__content-error">
                    {formState.errors.rootTokenContract.type == 'required' &&
                        intl.formatMessage({ id: 'ERROR_FIELD_IS_REQUIRED' })}
                    {(formState.errors.rootTokenContract.type == 'pattern' ||
                        formState.errors.rootTokenContract.type == 'validate') &&
                        intl.formatMessage({ id: 'ERROR_INVALID_ADDRESS' })}
                </div>
            )}
            <div style={{ display: 'flex', paddingTop: '16px' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button
                        disabled={disabled}
                        text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                        onClick={onBack}
                        white
                    />
                </div>
                <Button
                    disabled={disabled}
                    text={intl.formatMessage({ id: 'PROCEED_BTN_TEXT' })}
                    type="button"
                    onClick={handleSubmit(trySubmit)}
                />
            </div>
        </form>
    )
}

interface IAddNewToken {
    tokensManifest: TokensManifest | undefined
    tokensMeta: { [rootTokenContract: string]: TokensManifestItem } | undefined
    tokenWallets: nt.TokenWalletAsset[]
    knownTokens: { [rootTokenContract: string]: nt.Symbol }
    fetchManifest: StoreAction<typeof fetchManifest>
    onSubmit: (params: TokenWalletsToUpdate) => Promise<void>
    onBack: () => void
}

enum Tab {
    PREDEFINED,
    CUSTOM,
}

const AddNewToken: React.FC<IAddNewToken> = ({
    tokensManifest,
    tokenWallets,
    tokensMeta,
    knownTokens,
    fetchManifest,
    onSubmit,
    onBack,
}) => {
    const intl = useIntl()
    const [activeTab, setActiveTab] = useState(Tab.PREDEFINED)
    const [inProcess, setInProcess] = useState(false)
    const [error, setError] = useState<string>()
    //const [step, setStep] = useState<SelectTokenStep>(SelectTokenStep.SELECT)

    useEffect(() => {
        fetchManifest().catch(console.error)
    }, [])

    const handleSubmit = async (params: TokenWalletsToUpdate) => {
        setInProcess(true)
        try {
            await onSubmit(params)
            onBack()
        } catch (e: any) {
            setError(parseError(e))
            setInProcess(false)
        }
    }

    const tokens =
        tokensManifest?.tokens?.map((token) => ({
            name: token.symbol,
            fullName: token.name,
            rootTokenContract: token.address,
            old: token.version != null && token.version < 5,
        })) || []

    const existingTokens: TokenWalletsToUpdate = {}
    for (const token of tokenWallets) {
        existingTokens[token.rootTokenContract] = true

        if ((tokensMeta as any)[token.rootTokenContract] == null) {
            const symbol = knownTokens[token.rootTokenContract]
            if (symbol == null) {
                continue
            }

            tokens.push({
                name: symbol.name,
                fullName: symbol.fullName,
                rootTokenContract: symbol.rootTokenContract,
                old: symbol.version != 'Tip3',
            })
        }
    }

    return (
        <>
            {/*step === SelectTokenStep.SELECT && ( */}
            <>
                <h2 className="add-new-token__header noselect">
                    {intl.formatMessage({ id: 'USER_ASSETS_SELECT_ASSETS_HEADER' })}
                </h2>
                <div className="add-new-token">
                    <div className="add-new-token__panel noselect">
                        <div
                            className={cn('add-new-token__panel-tab', {
                                _active: activeTab == Tab.PREDEFINED,
                            })}
                            onClick={() => setActiveTab(Tab.PREDEFINED)}
                        >
                            {intl.formatMessage({
                                id: 'USER_ASSETS_SELECT_ASSETS_TAB_SEARCH_LABEL',
                            })}
                        </div>
                        <div
                            className={cn('add-new-token__panel-tab', {
                                _active: activeTab == Tab.CUSTOM,
                            })}
                            onClick={() => setActiveTab(Tab.CUSTOM)}
                        >
                            {intl.formatMessage({
                                id: 'USER_ASSETS_SELECT_ASSETS_TAB_CUSTOM_TOKEN_LABEL',
                            })}
                        </div>
                    </div>
                    {activeTab == Tab.PREDEFINED &&
                        ((tokensManifest?.tokens.length || 0) > 0 ? (
                            <SearchToken
                                existingTokens={existingTokens}
                                tokens={tokens}
                                disabled={inProcess}
                                onSubmit={handleSubmit}
                                onBack={onBack}
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
                        <CustomToken
                            disabled={inProcess}
                            error={error}
                            onBack={onBack}
                            onSubmit={handleSubmit}
                        />
                    )}
                </div>
            </>
            {/*)*/}
            {/*{step === SelectTokenStep.CONFIRM && (*/}
            {/*    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>*/}
            {/*        <h2>Do you want to add these assets?</h2>*/}
            {/*        {(tokensManifest?.tokens || [])*/}
            {/*            .filter((item) => selectedTokens?.includes(item.address))*/}
            {/*            .map((token) => (*/}
            {/*                <Token key={token.address} token={token} />*/}
            {/*            ))}*/}
            {/*        <div style={{ display: 'flex', paddingTop: '16px' }}>*/}
            {/*            <div style={{ width: '50%', marginRight: '12px' }}>*/}
            {/*                <Button*/}
            {/*                    text={'Back'}*/}
            {/*                    onClick={() => setStep(SelectTokenStep.SELECT)}*/}
            {/*                    white*/}
            {/*                />*/}
            {/*            </div>*/}
            {/*            <Button text={'Yes, add selected assets'} onClick={handleSubmit} />*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*)}*/}
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    tokensManifest: store.app.tokensManifest,
    tokensMeta: store.app.tokensMeta,
})

export default connect(mapStateToProps, {
    fetchManifest,
})(AddNewToken)
