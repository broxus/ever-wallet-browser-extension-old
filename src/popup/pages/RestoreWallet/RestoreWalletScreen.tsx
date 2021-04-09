import React from 'react'
import SelectWallet from '../SelectWallet/SelectWallet'
import './restore-wallet-screen.scss'

interface IRestoreWalletScreen {
    setStep: (arg0: number) => void
}

const RestoreWalletScreen: React.FC<IRestoreWalletScreen> = ({ setStep }) => (
    <SelectWallet restore setStep={setStep} />
)

export default RestoreWalletScreen
