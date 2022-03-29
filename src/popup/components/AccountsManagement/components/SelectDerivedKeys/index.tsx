import * as React from 'react'
import { useIntl } from 'react-intl'

import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import Button from '@popup/components/Button'
import Nav from '@popup/components/Nav'
import AccountSelector from '@popup/components/AccountSelector'
import { useRpcState } from '@popup/providers/RpcStateProvider'

const PAGE_LENGTH = 5

type PublicKeys = Map<string, number>

interface ISelectDerivedKeys {
    onSubmit: (publicKeys: PublicKeys) => void
    publicKeys: PublicKeys
    preselectedKey: string
    error?: string
    inProcess?: boolean
}

export function SelectDerivedKeys({
    onSubmit,
    publicKeys,
    preselectedKey,
    error,
    inProcess,
}: ISelectDerivedKeys): JSX.Element {
    const intl = useIntl()
    const accountability = useAccountability()
    const rpcState = useRpcState()
    const { derivedKeys } = accountability
    const [selectedKeys, setSelectedKeys] = React.useState<Map<string, number>>(
        new Map(derivedKeys.map(({ publicKey, accountId }) => [publicKey, accountId]))
    )
    const [currentPage, setCurrentPage] = React.useState<number>(0)

    const pagesCount = Math.ceil(publicKeys.size / PAGE_LENGTH)
    const startIndex = currentPage * PAGE_LENGTH
    const endIndex = startIndex + PAGE_LENGTH
    const visiblePublicKeys = [...publicKeys.keys()].slice(startIndex, endIndex)

    const onBack = () => {
        accountability.setStep(Step.MANAGE_SEED)
    }

    const onSelect = () => {
        onSubmit(selectedKeys)
    }

    const onCheck = (checked: boolean, publicKey: string) => {
        setSelectedKeys((selectedKeys) => {
            const accountId = publicKeys.get(publicKey)

            if (checked && accountId !== undefined) {
                selectedKeys.set(publicKey, accountId)
            } else if (!checked) {
                selectedKeys.delete(publicKey)
            }

            return new Map([...selectedKeys])
        })
    }

    const onClickNext = () => {
        setCurrentPage((currentPage) => {
            return currentPage < pagesCount - 1 ? ++currentPage : currentPage
        })
    }

    const onClickPrev = () => {
        setCurrentPage((currentPage) => {
            return currentPage > 0 ? --currentPage : currentPage
        })
    }

    return (
        <div className="accounts-management">
            <header className="accounts-management__header">
                <h2 className="accounts-management__header-title">
                    {intl.formatMessage({ id: 'SELECT_DERIVED_KEYS_PANEL_HEADER' })}
                </h2>
            </header>

            <div className="accounts-management__wrapper">
                <div>
                    <Nav
                        showNext
                        showPrev
                        onClickNext={onClickNext}
                        onClickPrev={onClickPrev}
                        hint={intl.formatMessage(
                            { id: 'SELECT_DERIVED_KEYS_NAV_HINT' },
                            { value: currentPage + 1, limit: pagesCount }
                        )}
                        title={intl.formatMessage({ id: 'SELECT_DERIVED_KEYS_NAV_TITLE' })}
                    />

                    {visiblePublicKeys.map((publicKey, index) => (
                        <AccountSelector
                            key={publicKey}
                            publicKey={publicKey}
                            keyName={rpcState.state.storedKeys[publicKey]?.name}
                            checked={selectedKeys.has(publicKey)}
                            setChecked={(checked) => onCheck(checked, publicKey)}
                            index={`${startIndex + index + 1}`}
                            preselected={publicKey === preselectedKey}
                            disabled={inProcess}
                        />
                    ))}
                    {error && <div className="accounts-management__content-error">{error}</div>}
                </div>

                <footer className="accounts-management__footer">
                    <div className="accounts-management__footer-button-back">
                        <Button
                            text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                            disabled={inProcess}
                            white
                            onClick={onBack}
                        />
                    </div>

                    <Button
                        text={intl.formatMessage({ id: 'SELECT_BTN_TEXT' })}
                        disabled={inProcess}
                        onClick={onSelect}
                    />
                </footer>
            </div>
        </div>
    )
}
