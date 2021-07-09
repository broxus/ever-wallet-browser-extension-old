import * as React from 'react'

import { ManageSeeds } from '@popup/components/AccountsManagement'
import { AccountabilityProvider } from '@popup/providers/AccountabilityProvider'
import { DrawerPanelProvider } from '@popup/providers/DrawerPanelProvider'


export function AccountsManagerPage(): JSX.Element {
	return (
		<DrawerPanelProvider>
			<AccountabilityProvider>
				<div className="accounts-management__page">
					<ManageSeeds />
				</div>
			</AccountabilityProvider>
		</DrawerPanelProvider>
	)
}
