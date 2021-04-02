import React from 'react'

import './style.scss'

class TopBarButton extends React.Component<{}, {}> {
    render() {
        return <button className="top-bar__refresh" />
    }
}

export class TopBar extends React.Component<{}, {}> {
    render() {
        return (
            <div className="top-bar">
                <TopBarButton />
            </div>
        )
    }
}
