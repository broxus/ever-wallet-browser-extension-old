import React, { useState } from 'react'
import { convertAddress, convertTons, getIconUrl } from '@utils'
import * as nt from '@nekoton'

import Button from '@components/Button'
import SlidingPanel from '@components/SlidingPanel'
import EnterPassword from '@components/EnterPassword'
import WebsiteIcon from '@components/WebsiteIcon'

import UserPicS from '@img/user-avatar-placeholder-s.svg'

export interface ISendMessageApproval {
    id: string
    type: 'sendMessage'
    origin: string
    requestData: {
        recipient: string
        amount: string
        abi?: string
        payload?: string
    }
}

interface IApproveSendMessage {
    approval: ISendMessageApproval
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
    onSubmit: () => void
    onReject: () => void
}

const ApproveSendMessage: React.FC<IApproveSendMessage> = ({
    approval,
    account,
    tonWalletState,
    onSubmit,
    onReject,
}) => {
    const { origin } = approval
    const { recipient, amount } = approval.requestData

    const balance = convertTons(tonWalletState?.balance || '0').toLocaleString()

    const [passwordModalVisible, setPasswordModalVisible] = useState<boolean>(false)

    return (
        <div className="connect-wallet">
            <div className="connect-wallet__spend-top-panel">
                <div className="connect-wallet__spend-top-panel__network">
                    <div className="connect-wallet__address-entry">
                        <UserPicS />
                        <div className="connect-wallet__spend-top-panel__account">
                            {account?.name}
                        </div>
                    </div>
                    <div className="connect-wallet__network" style={{ marginBottom: '0' }}>
                        Mainnet
                    </div>
                </div>
                <div className="connect-wallet__spend-top-panel__site">
                    <WebsiteIcon origin={origin} />
                    <div className="connect-wallet__address-entry">{origin}</div>
                </div>
                <h3 className="connect-wallet__spend-top-panel__header">
                    Allow this site to spend your WTON?
                </h3>
                <p className="connect-wallet__spend-top-panel__comment">
                    Do you trust this site? By granting this permission, you’re allowing
                    {origin} to withdraw your WTON and automate transactions for you.
                </p>
            </div>
            <div className="connect-wallet__spend-details">
                <p className="connect-wallet__spend-details-title">Transaction details</p>
                <div className="connect-wallet__details__description">
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">Fee</span>
                        <span className="connect-wallet__details__description-param-value">
                            0.12 TON
                        </span>
                    </div>
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">
                            Amount
                        </span>
                        <span className="connect-wallet__details__description-param-value">
                            {convertTons(amount)} TON
                        </span>
                    </div>
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">To</span>
                        <span className="connect-wallet__details__description-param-value">
                            {convertAddress(recipient)}
                        </span>
                    </div>
                </div>
                <p className="connect-wallet__spend-details-title">Data</p>
                <div className="connect-wallet__details__data">{JSON.stringify(mockData)}</div>
            </div>
            <div className="connect-wallet__buttons">
                <div className="connect-wallet__buttons-button">
                    <Button type="button" white text="Reject" onClick={onReject} />
                </div>
                <div className="connect-wallet__buttons-button">
                    <Button
                        type="submit"
                        text="Send"
                        onClick={() => {
                            setPasswordModalVisible(true)
                        }}
                    />
                </div>
            </div>
            <SlidingPanel
                isOpen={passwordModalVisible}
                onClose={() => setPasswordModalVisible(false)}
            >
                <EnterPassword
                    handleNext={onSubmit}
                    handleBack={() => setPasswordModalVisible(false)}
                />
            </SlidingPanel>
        </div>
    )
}

const mockData =
    'Function: broxusBridgeCallback(bytes payload, bytes[] signatures) ***\n' +
    'MethodID: 0x8fadb428\n' +
    '[0]:  0000000000000000000000000000000000000000000000000000000000000040\n' +
    '[1]:  0000000000000000000000000000000000000000000000000000000000000260\n' +
    '[2]:  0000000000000000000000000000000000000000000000000000000000000200\n' +
    '[3]:  0000000000000000000000000000000000000000000000000000000000000020\n' +
    '[4]:  d62f564ce88b83dc1a715f48820823502e3b1ae7d129c504f0f5f857c3427831\n' +
    '[5]:  00000000000000000000000000000000000000000000000000000c01570d73c1\n' +
    '[6]:  00000000000000000000000000000000000000000000000000000000607ff0f7\n' +
    '[7]:  0000000000000000000000000000000000000000000000000000000000000000\n' +
    '[8]:  0000000000000000000000000000000000000000000000000000000000000140\n' +
    '[9]:  0000000000000000000000000000000000000000000000000000000000000000\n' +
    '[10]: 651bb00af6a75314fd5479567ad4c411e40e692bfb94db174a05ac0d4a1c8a7c\n' +
    '[11]: 0000000000000000000000000000000000000000000000000000000000000002\n' +
    '[12]: 0000000000000000000000000000000000000000000000000000000000000002\n' +
    '[13]: 000000000000000000000000dceeae4492732c04b5224841286bf7146aa299df\n' +
    '[14]: 0000000000000000000000000000000000000000000000000000000000000080\n' +
    '[15]: 0000000000000000000000000000000000000000000000000000000000000000\n' +
    '[16]: 893d27bb9717bfdff7c5b31ca3c7e9338f6d23d05b3adac14b726bb4281f5e59\n' +
    '[17]: 0000000000000000000000000000000000000000000000000000067518fa5800\n' +
    '[18]: 000000000000000000000000bc5c11abbd453e36cdff349bd9e973f5462e606c\n' +
    '[19]: 0000000000000000000000000000000000000000000000000000000000000002\n' +
    '[20]: 0000000000000000000000000000000000000000000000000000000000000040\n' +
    '[21]: 00000000000000000000000000000000000000000000000000000000000000c0\n' +
    '[22]: 0000000000000000000000000000000000000000000000000000000000000041\n' +
    '[23]: 1256c39a54ecbcabed2e27f8c790dde551867c50cea168041a709aea07b1f456\n' +
    '[24]: 1aed014b5ee052af5e5cabb27390d4543650f5c0d345b7093b9f2eae13a80411\n' +
    '[25]: 1b00000000000000000000000000000000000000000000000000000000000000\n' +
    '[26]: 0000000000000000000000000000000000000000000000000000000000000041\n' +
    '[27]: e2ce13f13256617bdbc5489a159f7f926903e0d7071048b70bd24b99c9a2dc5d\n' +
    '[28]: 3e285adb79bf46bdbe81ab9d0c23a6ce253593d3f0cbeb440a983fcd95290907\n' +
    '[29]: 1c00000000000000000000000000000000000000000000000000000000000000'

export default ApproveSendMessage
