import React from 'react'

import './style.scss'

type IPage = {}

const Page: React.FC<IPage> = ({ children }) => {
    return (
        <div className="page">
            <div className="page__content">{children}</div>
        </div>
    )
}

export default Page
