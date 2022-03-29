import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import classNames from 'classnames'

import Button from '@popup/components/Button'

import * as nt from '@nekoton'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { ModalError, LedgerModal } from '@popup/components/Ledger/Modal'
import Nav from '@popup/components/Nav'
import AccountSelector from '@popup/components/AccountSelector'
import PanelLoader from '@popup/components/PanelLoader'
import { getEnvironmentType } from '@popup/utils/platform'
import { parseError } from '@popup/utils'

import './styles.scss'

interface IAccountSelector {
    theme?: 'sign-in'
    controllerRpc: IControllerRpcClient
    controllerState: ControllerState
    onBack: () => void
    onSuccess?: () => void
    onError?: (e: any) => void
}

type LedgerAccountDetails = {
    publicKey: string
    index: number
}

enum ledgerPages {
    'FIRST',
    'NEXT',
    'PREVIOUS',
}

const LedgerAccountSelector: React.FC<IAccountSelector> = ({
    theme,
    controllerRpc,
    controllerState,
    onBack,
    onSuccess,
    onError,
}) => {
    const intl = useIntl()
    const [selected, setSelected] = useState<number[]>([])
    const [keysToRemove, setKeysToRemove] = useState<string[]>([])
    const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccountDetails[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>()

    const getNewPage = async (page: ledgerPages) => {
        let accountSlice

        setLoading(true)
        setError(undefined)

        try {
            switch (page) {
                case ledgerPages.FIRST:
                    accountSlice = await controllerRpc.getLedgerFirstPage()
                    break
                case ledgerPages.NEXT:
                    accountSlice = await controllerRpc.getLedgerNextPage()
                    break
                case ledgerPages.PREVIOUS:
                    accountSlice = await controllerRpc.getLedgerPreviousPage()
                    break
            }

            setLedgerAccounts(accountSlice)
            setCurrentPage(accountSlice?.[0]?.index / 5 + 1)
        } catch (e: any) {
            console.error(e)
            setError(parseError(e))
            onError?.(e)
        }

        setLoading(false)
    }

    const saveAccounts = async () => {
        setError(undefined)
        setLoading(true)

        for (let i = 0; i < keysToRemove.length; i++) {
            const publicKeyToRemove = keysToRemove[i]
            const account = Object.values(controllerState.accountEntries).find(
                (account) => account.tonWallet.publicKey === publicKeyToRemove
            )

            try {
                await controllerRpc.removeKey({ publicKey: publicKeyToRemove })

                if (account) {
                    await controllerRpc.removeAccount(account.tonWallet.address)
                }
            } catch (e) {
                console.error(e)
                setError(parseError(e))
            }
        }

        for (let i = 0; i < selected.length; i++) {
            const accountId = selected[i]
            let key: nt.KeyStoreEntry | undefined

            try {
                key = await controllerRpc.createLedgerKey({
                    accountId,
                })

                await controllerRpc.createAccount({
                    name: 'Ledger ' + (accountId + 1),
                    publicKey: key.publicKey,
                    contractType: 'SafeMultisigWallet',
                    workchain: 0,
                })
            } catch (e: any) {
                if (key) {
                    controllerRpc.removeKey({ publicKey: key.publicKey }).catch(console.error)
                }

                console.error(e)
                setError(parseError(e))
            }
        }

        setLoading(false)

        if (!error) {
            onSuccess?.()
        }
    }

    useEffect(() => {
        getNewPage(ledgerPages.FIRST)
    }, [])

    return (
        <>
            <ModalError
                error={error}
                onClose={() => {
                    setError(undefined)
                }}
            />

            <div className={classNames('ledger-account-selector accounts-management', theme)}>
                <header className="accounts-management__header">
                    <h2 className="accounts-management__header-title">
                        {intl.formatMessage({ id: 'LEDGER_SELECT_KEYS' })}
                    </h2>
                </header>

                <div className="accounts-management__wrapper">
                    <div className="ledger-account-selector__content">
                        {loading && (
                            <PanelLoader
                                paddings={theme !== 'sign-in'}
                                transparent={theme === 'sign-in'}
                            />
                        )}

                        <Nav
                            showNext
                            showPrev={currentPage > 1}
                            hint={intl.formatMessage(
                                { id: 'LEDGER_PAGINATION_CURRENT_PAGE' },
                                { value: currentPage }
                            )}
                            onClickPrev={() => getNewPage(ledgerPages.PREVIOUS)}
                            onClickNext={() => getNewPage(ledgerPages.NEXT)}
                        />

                        {ledgerAccounts.map(({ publicKey, index }) => {
                            const isSelected =
                                selected.includes(index) ||
                                controllerState.storedKeys.hasOwnProperty(publicKey)
                            const isChecked = !keysToRemove.includes(publicKey) && isSelected

                            const setChecked = (checked: boolean) => {
                                if (!checked) {
                                    setSelected((prev) => prev.filter((item) => item !== index))
                                    setKeysToRemove((prev) => [...prev, publicKey])
                                } else {
                                    setSelected((prev) => [...prev, index])
                                    setKeysToRemove((prev) =>
                                        prev.filter((item) => item !== publicKey)
                                    )
                                }
                            }

                            return (
                                <AccountSelector
                                    key={publicKey}
                                    publicKey={publicKey}
                                    index={(index + 1).toString()}
                                    checked={isChecked}
                                    setChecked={setChecked}
                                />
                            )
                        })}
                    </div>

                    <footer className="accounts-management__footer">
                        <div className="accounts-management__footer-button-back">
                            <Button
                                white
                                text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                                onClick={onBack}
                            />
                        </div>

                        <Button
                            text={intl.formatMessage({ id: 'SELECT_BTN_TEXT' })}
                            disabled={loading}
                            onClick={saveAccounts}
                        />
                    </footer>
                </div>
            </div>
        </>
    )
}

export default LedgerAccountSelector
