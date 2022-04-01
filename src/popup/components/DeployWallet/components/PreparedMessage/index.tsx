import * as React from 'react'
import { useIntl } from 'react-intl'
import * as nt from '@nekoton'

import { NATIVE_CURRENCY } from '@shared/constants'

import Button from '@popup/components/Button'
import { EnterPassword } from '@popup/components/EnterPassword'
import SlidingPanel from '@popup/components/SlidingPanel'
import { convertTons } from '@shared/utils'

type Props = {
    keyEntry?: nt.KeyStoreEntry
    balance?: string
    custodians?: string[]
    fees?: string
    error?: string
    disabled?: boolean
    onSubmit(password: string): void
    onBack(): void
}

export function PreparedMessage({
    keyEntry,
    balance,
    custodians,
    disabled,
    error,
    fees,
    onSubmit,
    onBack,
}: Props): JSX.Element {
    const intl = useIntl()
    const [passwordModalVisible, setPasswordModalVisible] = React.useState(false)

    const onDeploy = () => {
        setPasswordModalVisible(true)
    }

    const onCancel = () => {
        setPasswordModalVisible(false)
    }

    return (
        <div className="deploy-wallet__wrapper">
            <div className="deploy-wallet__details">
                <div className="deploy-wallet__details-param">
                    <span className="deploy-wallet__details-param-desc">
                        {intl.formatMessage({
                            id: 'DEPLOY_WALLET_DETAILS_TERM_BALANCE',
                        })}
                    </span>
                    <span className="deploy-wallet__details-param-value">
                        {`${convertTons(balance).toLocaleString()} ${NATIVE_CURRENCY}`}
                    </span>
                </div>

                <div className="deploy-wallet__details-param">
                    <span className="deploy-wallet__details-param-desc">
                        {intl.formatMessage({
                            id: 'DEPLOY_WALLET_DETAILS_TERM_FEE',
                        })}
                    </span>
                    <span className="deploy-wallet__details-param-value">
                        {fees
                            ? `${convertTons(fees)} ${NATIVE_CURRENCY}`
                            : intl.formatMessage({
                                  id: 'CALCULATING_HINT',
                              })}
                    </span>
                </div>

                {custodians?.map((custodian, idx) => (
                    <div key={custodian} className="deploy-wallet__details-param">
                        <span className="deploy-wallet__details-param-desc">
                            {intl.formatMessage(
                                {
                                    id: 'DEPLOY_MULTISIG_DETAILS_TERM_CUSTODIAN',
                                },
                                { index: idx + 1 }
                            )}
                        </span>
                        <span className="deploy-wallet__details-param-value">{custodian}</span>
                    </div>
                ))}
            </div>

            <footer className="deploy-wallet__footer">
                <div className="deploy-wallet__footer-button-back">
                    <Button
                        text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                        white
                        onClick={onBack}
                    />
                </div>
                <Button
                    text={intl.formatMessage({ id: 'DEPLOY_BTN_TEXT' })}
                    disabled={!fees}
                    onClick={onDeploy}
                />
            </footer>

            <SlidingPanel
                isOpen={passwordModalVisible}
                onClose={() => setPasswordModalVisible(false)}
            >
                <EnterPassword
                    keyEntry={keyEntry}
                    disabled={disabled}
                    error={error}
                    handleNext={onSubmit}
                    handleBack={onCancel}
                />
            </SlidingPanel>
        </div>
    )
}
