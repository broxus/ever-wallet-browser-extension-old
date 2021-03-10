import React from 'react'
import ReactDOM from 'react-dom'

import WelcomeScreen from '../pages/WelcomeScreen/WelcomeScreen'
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
