import React from 'react'
import ReactDOM from 'react-dom'

import { TopBar } from '../components/topBar'

import { AssetsList } from '../components/assetsList'
import WelcomeScreen from '../pages/WelcomeScreen'
import '../styles/main.scss'

class App extends React.Component<{}, {}> {
    render() {
        return (
            <WelcomeScreen />
            // <div>
            //     <TopBar />
            //     <AssetsList />
            // </div>
        )
    }
}

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root')
)
