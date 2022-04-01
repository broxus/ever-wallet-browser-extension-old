import * as React from 'react'
import { useIntl } from 'react-intl'
import classNames from 'classnames'

import * as nt from '@nekoton'
import UserAvatar from '@popup/components/UserAvatar'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { convertAddress } from '@shared/utils'

import Arrow from '@popup/img/arrow.svg'

type Props = {
    items: nt.AssetsList[]
    onClick(account: nt.AssetsList): void
}

export function AccountsList({ items, onClick }: Props): JSX.Element {
    const intl = useIntl()
    const accountability = useAccountability()

    const onManageAccount = (account: nt.AssetsList) => {
        return () => onClick(account)
    }

    return (
        <ul className="accounts-management__list">
            {items.map((account) => (
                <li key={account.tonWallet.address}>
                    <div
                        role="button"
                        className={classNames('accounts-management__list-item', {
                            'accounts-management__list-item--active':
                                account.tonWallet.address === accountability.selectedAccountAddress,
                        })}
                        onClick={onManageAccount(account)}
                    >
                        <UserAvatar
                            address={account.tonWallet.address}
                            className="accounts-management__list-item-icon"
                            small
                        />
                        <div className="accounts-management__list-item-title">
                            {account.name || convertAddress(account.tonWallet.address)}
                        </div>
                        <div className="accounts-management__list-item-visibility">
                            {accountability.accountsVisibility[account.tonWallet.address]
                                ? intl.formatMessage({ id: 'DISPLAYED' })
                                : intl.formatMessage({ id: 'HIDDEN' })}
                        </div>
                        <img src={Arrow} alt="" style={{ height: 24, width: 24 }} />
                    </div>
                </li>
            ))}
        </ul>
    )
}
