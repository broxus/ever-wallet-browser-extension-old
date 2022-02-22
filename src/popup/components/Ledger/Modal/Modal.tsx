import React from 'react'

import Modal from '@popup/components/Modal'

import './styles.scss'

interface ISelectWallet {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
}

export const LedgerModal: React.FC<ISelectWallet> = ({ title, children, onClose }) => {
    return (
        <Modal
            className="ledger-modal-error"
            onClose={onClose}
        >
            <h3 style={{ color: 'black', marginBottom: '18px' }}>
                {title}
            </h3>
            {children}
        </Modal>
    )
}
