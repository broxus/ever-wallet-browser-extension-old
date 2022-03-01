import React from 'react'

import { LedgerModal } from '@popup/components/Ledger/Modal/Modal'

import './styles.scss'

interface ISelectWallet {
    error?: string
    onClose: () => void;
}

export const ModalError: React.FC<ISelectWallet> = ({ error, onClose }) => {
    if (!error) {
        return null
    }

    return (
        <LedgerModal
            title="Could not connect your Ledger"
            onClose={onClose}
        >
            <div className="error-message">{error}</div>
        </LedgerModal>
    )
}
