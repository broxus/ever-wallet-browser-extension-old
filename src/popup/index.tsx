import React, {useEffect, useState} from 'react'
import ReactDOM from 'react-dom'

import WelcomeScreen from '../pages/WelcomeScreen/WelcomeScreen'
import PolicySignScreen from '../pages/PolicySignScreen/PolicySignScreen'
import GenerateSeedScreen, {CheckSeed} from '../pages/GenerateSeed/GenerateSeedScreen'
import CreatePasswordScreen, {
    ConfirmPasswordScreen,
} from '../pages/CreatePassword/CreatePasswordScreen'
import MainPageScreen from '../pages/MainPage/MainPageScreen'
import '../styles/main.scss'
import CreateAccountScreen from '../pages/CreateAccount/CreateAccountScreen'

import init, {
    Storage,
    StoredKey,
    KeyStore,
    AccountType,
} from "../../nekoton/pkg";
import {StorageConnector} from '../background/common';

const tempScreens = [
    <WelcomeScreen/>,
    <PolicySignScreen/>,
    <GenerateSeedScreen/>,
    <CheckSeed/>,
    <CreatePasswordScreen/>,
    <ConfirmPasswordScreen/>,
    <MainPageScreen/>,
    <CreateAccountScreen/>,
]

const App: React.FC = () => {
    const [step, setStep] = useState(6)

    const navigate = (event: { key: any }) => {
        const key = event.key // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"
        switch (key) {
            case 'ArrowLeft':
                setStep((prevState) => prevState - 1)
                break
            case 'ArrowRight':
                setStep((prevState) => prevState + 1)
                break
            case 'ArrowUp':
                // Up pressed
                break
            case 'ArrowDown':
                // Down pressed
                break
        }
    }

    useEffect(() => {
        document.addEventListener('keydown', navigate)
        // return () => document.removeEventListener('keydown', navigate, true) // Succeeds
    }, [])

    return tempScreens[step] || <div>failed</div>
}

ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById('root')
);

(async () => {
    await init("index_bg.wasm");

    const phrase = StoredKey.generateMnemonic(AccountType.makeLabs(0));
    console.log(phrase.phrase, phrase.accountType);
    //
    const key = phrase.createKey("Main key", "test"); // `phrase` moved here
    console.log(key);
    // Can't use `phrase` here

    const publicKey = key.publicKey;

    const storage = new Storage(new StorageConnector());
    const keyStore = await KeyStore.load(storage);

    await keyStore.addKey(key);
    console.log("Added key to keystore");

    const restoredKey = await keyStore.getKey(publicKey);
    console.log("Restored key:", restoredKey);

    console.log(keyStore.storedKeys);
})();
