import React from 'react'
import ReactDOM from 'react-dom'

import '../styles/main.scss'

import { TopBar } from '../components/topBar'
import { AssetsList } from '../components/assetsList'

class App extends React.Component<{}, {}> {
    render() {
        return (
            <div>
                <TopBar />
                <AssetsList />
            </div>
        )
    }
}

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root')
)
