import React from 'react'
import classNames from 'classnames'

import * as nt from '@nekoton'
import { Checkbox } from '@popup/components/Checkbox'
import UserAvatar from '@popup/components/UserAvatar'
import { convertAddress, convertTons } from '@shared/utils'

import './style.scss'

interface IAccount {
    preselected?: boolean
    checked?: boolean
    setChecked: (checked: boolean) => void
    publicKey: string,
    index?: string,
    // balance: string
}

const AccountSelector = ({
    preselected,
    checked,
    setChecked,
    publicKey,
    index,
}: IAccount) => (
    <div
        className={classNames({
            'account-selector': true,
            'account-selector_selected': preselected,
        })}
    >
        <Checkbox
            checked={Boolean(checked || preselected)}
            onChange={!preselected ? setChecked : () => {}}
        />

        <UserAvatar
            className="account-selector__avatar"
            address={nt.computeTonWalletAddress(publicKey, 'SafeMultisigWallet', 0)}
        />

        {index && (
            <span className="account-selector__index">{index}</span>
        )}

        {/*<div>*/}
        <span
            className={classNames({
                'account-selector__public-key': true,
                'account-selector__grey': preselected,
            })}
        >
            {convertAddress(publicKey)}
        </span>
        {/*<div className="account-selector__grey">*/}
        {/*    {convertTons(balance)} TON*/}
        {/*</div>*/}
        {/*</div>*/}
    </div>
)

export default AccountSelector
