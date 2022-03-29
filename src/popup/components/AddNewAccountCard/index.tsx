import * as React from 'react'
import { useIntl } from 'react-intl'

import AddAccount from '@popup/img/add-account.svg'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { Panel, useDrawerPanel } from '@popup/providers/DrawerPanelProvider'

import './style.scss'

export function AddNewAccountCard(): JSX.Element {
    const intl = useIntl()
    const accountability = useAccountability()
    const drawer = useDrawerPanel()

    const addAccount = () => {
        const masterKey = accountability.masterKeys.find(
            (key) => key.masterKey === accountability.selectedMasterKey
        )
        accountability.setCurrentMasterKey(masterKey)
        drawer.setPanel(Panel.CREATE_ACCOUNT)
    }

    return (
        <div className="new-account" onClick={addAccount}>
            <div className="new-account-icon">
                <img src={AddAccount} alt="" />
            </div>
            <div className="new-account-title">
                {intl.formatMessage({ id: 'ACCOUNT_CARD_ADD_ACCOUNT_HEADER' })}
            </div>
            <div className="new-account-comment">
                {intl.formatMessage({ id: 'ACCOUNT_CARD_ADD_ACCOUNT_NOTE' })}
            </div>
        </div>
    )
}
