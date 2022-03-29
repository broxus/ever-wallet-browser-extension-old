import * as React from 'react'
import { useIntl } from 'react-intl'
import { NATIVE_CURRENCY } from '@shared/constants'
import * as nt from '@nekoton'

import AddNewToken from '@popup/components/AddNewToken'
import { AssetsListItem } from '@popup/components/UserAssets/components'
import Button from '@popup/components/Button'
import SlidingPanel from '@popup/components/SlidingPanel'
import { TokenWalletsToUpdate } from '@shared/backgroundApi'
import { SelectedAsset, TokenWalletState } from '@shared/utils'

type Props = {
    tonWalletAsset: nt.TonWalletAsset
    tokenWalletAssets: nt.TokenWalletAsset[]
    tonWalletState: nt.ContractState | undefined
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState }
    knownTokens: { [rootTokenContract: string]: nt.Symbol }
    updateTokenWallets: (params: TokenWalletsToUpdate) => Promise<void>
    onViewAsset: (asset: SelectedAsset) => void
}

enum Panel {
    ADD_NEW_TOKEN,
}

export function AssetsList({
    tonWalletAsset,
    tokenWalletAssets,
    tonWalletState,
    tokenWalletStates,
    knownTokens,
    updateTokenWallets,
    onViewAsset,
}: Props): JSX.Element {
    const intl = useIntl()
    const [openedPanel, setOpenedPanel] = React.useState<Panel>()

    const closePanel = () => setOpenedPanel(undefined)

    return (
        <div className="user-assets__assets-list">
            <AssetsListItem
                type={'ton_wallet'}
                address={tonWalletAsset.address}
                balance={tonWalletState?.balance}
                name={NATIVE_CURRENCY}
                decimals={9}
                onClick={() =>
                    onViewAsset({
                        type: 'ton_wallet',
                        data: {
                            address: tonWalletAsset.address,
                        },
                    })
                }
            />
            {tokenWalletAssets.map(({ rootTokenContract }) => {
                const symbol = knownTokens[rootTokenContract]
                const balance = tokenWalletStates[rootTokenContract]?.balance
                return (
                    <AssetsListItem
                        key={rootTokenContract}
                        type={'token_wallet'}
                        address={rootTokenContract}
                        balance={balance}
                        name={symbol?.name}
                        decimals={symbol?.decimals}
                        old={symbol?.version != 'Tip3'}
                        onClick={() => {
                            onViewAsset({
                                type: 'token_wallet',
                                data: {
                                    owner: tonWalletAsset.address,
                                    rootTokenContract,
                                },
                            })
                        }}
                    />
                )
            })}
            <div className="user-assets__assets-list__add-new-btn">
                <Button
                    text={intl.formatMessage({ id: 'SELECT_ASSETS_BTN_TEXT' })}
                    white
                    onClick={() => setOpenedPanel(Panel.ADD_NEW_TOKEN)}
                />
            </div>
            <SlidingPanel isOpen={openedPanel != null} onClose={closePanel}>
                <AddNewToken
                    tokenWallets={tokenWalletAssets}
                    knownTokens={knownTokens}
                    onSubmit={updateTokenWallets}
                    onBack={closePanel}
                />
            </SlidingPanel>
        </div>
    )
}
