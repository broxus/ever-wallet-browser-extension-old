import React from 'react'
import { getIconUrl } from '@utils'

import './style.scss'

interface IWebsiteIcon {
    origin: string
}

const WebsiteIcon: React.FC<IWebsiteIcon> = ({ origin }) => (
    <img className="website-icon" src={getIconUrl(origin)} alt="page" />
)

export default WebsiteIcon
