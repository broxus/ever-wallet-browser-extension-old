import * as nt from '../../../../nekoton/pkg'
import React, { useState } from 'react'
import cn from 'classnames'
import { Asset, TransactionsList } from '../../pages/MainPage/MainPageScreen'
import SlidingPanel from '../SlidingPanel/SlidingPanel'
import AddNewToken from '../AddNewToken/AddNewToken'
import Button from '../Button'

type UserAssetsProps = {
    tonWalletState: nt.AccountState | null
    transactions: nt.Transaction[]
    setActiveContent: (arg0: number) => void
}

type AssetsListProps = {
    tonWalletState: nt.AccountState | null
    setActiveContent: (arg0: number) => void
}

const AssetsList: React.FC<AssetsListProps> = ({ tonWalletState, setActiveContent }) => {
    const [panelVisible, setPanelVisible] = useState(false)

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
            }}
        >
            {/*TODO remove later*/}
            {tonWalletState && (
                <div onClick={() => setActiveContent(6)}>
                    <Asset tonWalletState={tonWalletState} />
                </div>
            )}
            {/*<div*/}
            {/*    style={{*/}
            {/*        width:'100%',*/}
            {/*        height: '70px',*/}
            {/*        background:*/}
            {/*            'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 44%)',*/}
            {/*        bottom: 0,*/}
            {/*        position: 'absolute',*/}
            {/*    }}*/}
            {/*></div>*/}
            {/*<div style={{ width: '148px', position: 'absolute', bottom: '0', left: '85px' }}>*/}
            <div style={{ marginBottom: '32px' }}>
                <Button text={'Add new asset'} white onClick={() => setPanelVisible(true)} />
            </div>
            {/*</div>*/}
            <SlidingPanel isOpen={panelVisible} setIsOpen={setPanelVisible}>
                <AddNewToken onReturn={setPanelVisible} />
            </SlidingPanel>
        </div>
    )
}

const UserAssets: React.FC<UserAssetsProps> = ({
    tonWalletState,
    transactions,
    setActiveContent,
}) => {
    const [activeTab, setActiveTab] = useState(0)
    const content = [
        <AssetsList tonWalletState={tonWalletState} setActiveContent={setActiveContent} />,
        <TransactionsList transactions={transactions} />,
    ]

    return (
        <>
            <div className="main-page__user-assets">
                <div className="main-page__user-assets-panel">
                    <div
                        className={cn('main-page__user-assets-panel-tab', {
                            _active: activeTab === 0,
                        })}
                        onClick={() => setActiveTab(0)}
                    >
                        Assets
                    </div>
                    <div
                        className={cn('main-page__user-assets-panel-tab', {
                            _active: activeTab === 1,
                        })}
                        onClick={() => setActiveTab(1)}
                    >
                        Transactions
                    </div>
                </div>
                {content[activeTab]}
            </div>
        </>
    )
}

export default UserAssets
