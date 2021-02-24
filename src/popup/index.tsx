import React from 'react';
import ReactDOM from 'react-dom';

import '../styles/main.scss';

import { TopBar } from '../components/topBar';

class App extends React.Component<{}, {}> {
    render() {
        return (
            <div>
                <TopBar/>
            </div>
        );
    }
}

ReactDOM.render(<React.StrictMode><App/></React.StrictMode>, document.getElementById('root'));
