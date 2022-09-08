<p align="center">
    <h3 align="center">EVER Wallet</h3>
    <p align="center">A browser extension to manage Everscale wallets and access dApps directly from your browser.</p>
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
docker build --tag ever-wallet-extension .

# Build extension
docker run -ti --rm --mount type=bind,source=$(pwd),target=/app ever-wallet-extension

# Extension output will be at $(pwd)/dist 
```

## Dev build requirements

- Rust 1.58+ with installed target `wasm32-unknown-unknown`
- wasm-pack
- binaryen 99+ (for `wasm-opt`)
- Node.js 14+

## Changelog

### 0.2.35 (2022-09-09)

Features

* Changed default GQL endpoints.
* Added RFLD network.
* Allow specifying ABI version in `packIntoCell` and `unpackFromCell`.
* Added `findTransaction` method to the provider api.

### 0.2.34 (2022-08-09)

Security fix

### 0.2.33 (2022-08-05)

Features

* Added support for ABI 2.3.
* Allow guessing method/event in `decodeInput`, `decodeEvent`, `decodeOutput`, `decodeTransaction`.
* Added `networkId` to the `getProviderState` method and `networkChanged` notification.
* Added `sendMessageDelayed` and `sendExternalMessageDelayed` methods to the provider api.

### 0.2.32 (2022-07-13)

Features

* Added passwords cache. If enabled, password for each seed will be saved for 30 minutes in the secure runtime cache.
  Can be enabled in `Manage seeds & accounts` panel.
* Added `setCodeSalt`, `getCodeSalt` and `mergeTvc` methods to the provider api
* `getExpectedAddress` now also returns `stateInit`
* Added local requests cache for JRPC transport
* Added Japanese localization
* Reduced WASM size
* Optimized contract subscriptions

Bugfixes

* Fixed timing issues when contract state was modified the same second it was used in `runLocal`
* Fixed `codeHash` field in `FullContractState`

### 0.2.31 (2022-05-01)

Bugfixes

* Fixed Ledger app connection (still in beta)
* Fixed gql endpoint selection

### 0.2.30 (2022-04-01)

Features

* Added Korean localisation

Bugfixes

* Fixed multisig transaction expiration label
* Fixed transaction explorer link

### 0.2.29 (2022-03-24)

Bugfixes

* Fixed multisig transactions

### 0.2.28 (2022-03-23)

Bugfixes

* Fixed recipient in the token transaction details popup
* Fixed potential panics in cells deserialization
* Fixed `Waiting for confirmation` label for multisig transactions with `reqConfirms: 0`
* Fixed restore for external accounts

### 0.2.27 (2022-03-01)

Features

* Added initial Ledger support
* Added support for external `SetcodeMultisig24h`

Bugfixes

* Fixed token transfer transaction info
* Fixed explorer links

### 0.2.26 (2022-02-11)

Features

* Added support for new TIP3.1 tokens standard
* Added `encryptData` and `decryptData` methods to provider api

### 0.2.25 (2022-01-08)

Features

* Finally, rework GQL transport
* Added Firefox browser support
* Additionally inject `__ever` object into pages. (`ton` object will be removed soon due to blockchain renaming)
* Added `getTransaction` and `getAccountsByCodeHash` methods to provider api

### 0.2.24 (2021-12-26)

Features

* Replace API for `ADNL RPC` to work with Rust nodes

## Changelog

### 0.2.23 (2021-12-04)

Rename TON to EVER. `TON Crystal Wallet` is now `EVER Wallet`

Bugfixes

* Fixed `addAsset` provider method.

### 0.2.22 (2021-12-04)

Bugfixes

* Minor endpoints fixes

### 0.2.21 (2021-11-26)

Features

* Added `changeAccount` method to provider api.

### 0.2.20 (2021-11-23)

Features

* Extended message model in provider API

Bugfixes

* Fixed account state decoding
* Fixed origin metadata

### 0.2.19 (2021-11-10)

Features

* Added `getBocHash` and `signDataRaw` methods to provider api.

Bugfixes

* Fixed white screen for invalid public key on `signData`.
* Fixed consecutive approval windows.
* Swap high and low bytes in signed data.

### 0.2.18 (2021-10-29)

Features

* Reworked internal application clock. It now can work with incorrect system time.
* Optimized WASM bundle size

Bugfixes

* Fixed incorrect start behaviour after unsuccessful addition of an external account.

### 0.2.17 (2021-10-12)

Bugfixes

* Fixed zerostate accounts management (added special handlers for `-1:777..`, `-1:888..` and `-1:999..`)

### 0.2.16 (2021-10-09)

Bugfixes

* Minor UI and provider fixes

### 0.2.15 (2021-10-05)

Features

* Added local node support
* Added `signData` and `addAsset` approval windows (use `ton-inpage-provider@^0.1.28`)
* Added `verifySignature` and `sendUnsignedExternalMessage` methods to provider api

Bugfixes

* Fixed mapping keys parsing in provider api

### 0.2.14 (2021-09-20)

Features

* Added bridge multisig support

Bugfixes

* Fixed CVE-2021-3757, CVE-2021-3749, CVE-2021-23436 in dependencies

### 0.2.13 (2021-09-11)

Minor fixes

### 0.2.12 (2021-09-10)

Features

* Added support for local `sendExternalMessage` execution
* Added `exitCode` to transactions model

Bugfixes

* Fixed empty ADNL transactions response

### 0.2.11 (2021-09-02)

Minor fixes

### 0.2.10 (2021-09-01)

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
* Web3-like interface ([everscale-inpage-provider](https://github.com/broxus/everscale-inpage-provider))
