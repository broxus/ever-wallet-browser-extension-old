import React from 'react'

interface IWalletAddress {
    address: string
}
const WalletAddress: React.FC<IWalletAddress> = ({ address }) => <div>{address}</div>

export default WalletAddress
