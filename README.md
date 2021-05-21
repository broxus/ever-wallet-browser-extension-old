<p align="center">
    <h3 align="center">TON Crystal Wallet</h3>
    <p align="center">TON Wallet browser extension. Manage Free TON wallets and access dApps directly from your Chrome browser.</p>
    <p align="center">
        <a href="/LICENSE">
            <img alt="GitHub" src="https://img.shields.io/github/license/broxus/ton-wallet-crystal-browser-extension" />
        </a>
        <a href="https://chrome.google.com/webstore/detail/ton-crystal-wallet/cgeeodpfagjceefieflmdfphplkenlfk">
            <img alt="Chrome Web Store" src="https://img.shields.io/chrome-web-store/v/cgeeodpfagjceefieflmdfphplkenlfk">
        </a>
    </p>
</p>

## How to build

```bash
# Prepare builder container
docker build --tag ton-crystal-extension .

# Build extension
docker run -ti --rm --mount type=bind,source=$(pwd),target=/app ton-crystal-extension

# Extension output will be at $(pwd)/dist 
```

## Dev build requirements

- Rust 1.50+ with installed target `wasm32-unknown-unknown`
- wasm-pack
- binaryen 99+ (for `wasm-opt`)
- Node.js 14+

## Changelog

### 0.1.6 (2021-05-22)

Features:
* Added `packIntoCell` and `unpackFromCell` methods to the provider api.
* Added support for base64 encoded BOC in message comments.

Bugfixes:
* Fixed hex numbers in provider api (finally).
* Fixed potential connection error.

### 0.1.5 (2021-05-19)

Features:
* Added support for [TIP3v4](https://github.com/broxus/ton-eth-bridge-token-contracts/releases/tag/4.0)

Bugfixes:
* Fixed hex numbers in provider api.
* Fixed strange behavior on sites from atlassian.

### 0.1.4 (2021-05-17)

Features:
* Added network switch.
* Added `decodeEvent` and `decodeTransactionEvents` methods to the provider api.
* Added `version` for provider api `getProviderState` method response.
* Changed provider api `getTransactions` method.

Bugfixes:
* Fixed `cachedState` param for provider api `runLocal` method.
* Fixed `decodeTransaction` on function calls with outputs.

### 0.1.3 (2021-05-15)

Features:
* Added `Notify receiver` checkbox for token transfer.
* Added version label to account modal.

Bugfixes:
* Fixed password input for duplicated words.
* Hide `Send` button for empty WalletV3.
* Fixed public key label in account card.

### 0.1.2 (2021-05-14)

Bugfixes:
* Fixed wasm-bindgen module resolution.
* Fixed outdated wasm-pack.
* Fixed memory leaks due to invalid allocator.

### 0.1.1 (2021-05-13)

Bugfixes:
* Fixed early exit from web3 subscription in case of error.

### 0.1.0 (2021-05-12)

Initial release
* Single account.
* TON wallet support.
* TIP-3 tokens support ([Broxus TIP3v3.1](https://github.com/broxus/ton-eth-bridge-token-contracts/releases/tag/3.1))
* Web3-like interface ([ton-inpage-provider](https://github.com/broxus/ton-inpage-provider))
