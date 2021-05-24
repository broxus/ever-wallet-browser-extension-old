import React from 'react'
import './style.scss'
import moment from 'moment'
import Button from '@popup/components/Button'
import Modal from '@popup/components/Modal'

const testNotifications = [
    {
        name: 'New version 14.1.2 installed',
        timestamp: Date.now() - 1293939,
    },
]

const iconPlaceholder = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z"
            fill="#96A1A7"
        />
    </svg>
)

interface INotifications {
    onClose: () => void
}

const Notifications: React.FC<INotifications> = ({ onClose }) => (
    <Modal onClose={onClose} className="notification-wrapper">
        <div className="notification">
            {testNotifications.map((el, i) => (
                <div key={i} className="notification__record">
                    {iconPlaceholder}
                    <div style={{ paddingLeft: '16px', display: 'flex', alignItems: 'center' }}>
                        <div>
                            <div className="notification__record-title">{el.name}</div>
                            <div className="notification__record-timestamp">
                                {moment(el.timestamp).fromNow()}
                            </div>
                        </div>
                        <div style={{ width: '33%' }}>
                            <Button
                                text="Update"
                                onClick={() =>
                                    chrome.tabs.create({
                                        url: 'https://broxus.com',
                                        active: false,
                                    })
                                }
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </Modal>
)

export default Notifications
