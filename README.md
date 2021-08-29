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

### 0.2.10 (2021-09-??)

Features

* Added support for ABI 2.1
* Reworked key creation window 

Bugfixes

* Fixed password visibility in confirmation popup

### 0.2.9 (2021-08-25)

Bugfixes

* Fixed saving the selected connection id

### 0.2.8 (2021-08-24)

Security

* Fixed CVE-2021-23343 in dependencies 

### 0.2.7 (2021-08-19)

Bugfixes

* Fixed network selection for broken connections

### 0.2.6 (2021-08-17)

Bugfixes

* Fixed next account id selection
* Fixed default account name
* Fixed error label while importing seed

### 0.2.5 (2021-08-15)

Bugfixes

* Fixed balance in assets list for tokens with zero decimals

### 0.2.4 (2021-08-14)

Bugfixes

* Fixed abi parsing in provider middleware
* Fixed masterchain accounts import

### 0.2.3 (2021-08-11)

Bugfixes

* Fixed parsing of bounced TIP3 messages (finally)

### 0.2.2 (2021-07-29)

Bugfixes

* Fixed bounce flag usage for `sendMessage` provider method

### 0.2.1 (2021-07-21)

Bugfixes

* Fixed fee calculation for `sendMessage` approval
* Fixed parsing of bounced TIP3 messages

### 0.2.0 (2021-07-14)

Features

* Reworked accounts flow
* Added full multisig flow support
* Show pending transactions in history
* Rework network selection
* Added missing seed exporting feature

Bugfixes

* Fixed annoying transaction popup
* Fixed window closing on focus lost (by using separate windows for each complex form)

### 0.1.12 (2021-06-28)

Features

* Added `extractPublicKey`, `codeToTvc` and `splitTvc` methods to the provider api.
* Optimized transactions for multisig wallets with one custodian.

### 0.1.11 (2021-06-21)

Bugfixes

* Fixed external function call.
* Fixed contract interaction popup.
* Fixed fetching history with non-ordinary transactions.

### 0.1.10 (2021-06-07)

Bugfixes

* Fixed initial migration.
* Fixed initial account selection. 

### 0.1.9 (2021-06-04)

Bugfixes

* Fixed automatic network selection logic.

### 0.1.8 (2021-06-02)

Features

* Added waiting for background script in the popup.
* Iterate over all possible transports in selected network group until a working one is found. 

Bugfixes

* Fixed selected network persistence.
* Fixed token transactions preloading

### 0.1.7 (2021-06-01)

Features

* Added support for both base64 and base64 url-safe addresses.
* Added support for ADNL RPC API, it can now be used in some cases when https://main.ton.dev/graphql is down.
* Added old transactions preloading.

Bugfixes:

* Performance issues in transactions list.
* Fixed network switch.

### 0.1.6 (2021-05-22)

Features:

* Added `packIntoCell` and `unpackFromCell` methods to the provider api.
* Added support for base64 encoded BOC in message comments.

Bugfixes:

* Fixed hex numbers in provider api (finally).
* Fixed potential connection error.

### 0.1.5 (2021-05-19)

Features:

* Added support
  for [TIP3v4](https://github.com/broxus/ton-eth-bridge-token-contracts/releases/tag/4.0)

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
* TIP-3 tokens
  support ([Broxus TIP3v3.1](https://github.com/broxus/ton-eth-bridge-token-contracts/releases/tag/3.1))
* Web3-like
  interface ([ton-inpage-provider](https://github.com/broxus/ton-inpage-provider))
