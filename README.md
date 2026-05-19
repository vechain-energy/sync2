# Sync2

The next generation VeChain wallet for all platforms.

## What's New

Compared to Sync v1, the most significant change is that the built-in dApp browser is abandoned. That means now dApps can freely run in your favorite web browser.

## Wallet Features

- Name support: `.vet` and `.vet.domains` names can be entered on the send screen and displayed for known addresses. Reverse names are network-aware and fall back to the raw address when no name is set.
- Domains: the Domains menu lets users check `.vet` availability, see the VET cost, select the paying wallet/address, register the name, and view a confirmation screen after success.
- Swap: the Swap menu quotes active mainnet tokens through VeTrade.vet and BetterSwap.io, shows route, slippage, minimum received, and fee, then uses the normal signing dialog for the selected wallet.
- Primary name: registration can also set the new name as the owner's primary name. Wallet lists refresh the primary name immediately after the transaction is signed.
- Fees: transactions use VeChain dynamic fee fields on Galactica-compatible nodes. Sync2 shows the current estimated fee and max fee cap, and blocks signing when the connected node does not expose fee market data.
- Private keys: wallets can import a single private key and export one address key at a time. Export is hidden for Ledger wallets, password-gated, and requires an explicit reveal and copy action.
- Networks: built-in public nodes are limited to `mainnet.vechain.org` and `testnet.vechain.org`.
- Explorer: mainnet links use VeChainStats, including `/transactions/` transaction URLs.

## Supported Platforms

| Platform | | Link |
| --- | --- | --- |
| Browser (nightly/unstable) | | https://lite.sync.vecha.in |
| Desktop | | |
| | Windows | [Releases](https://github.com/vechain-energy/sync2/releases/latest) |
| | macOS | [Releases](https://github.com/vechain-energy/sync2/releases/latest) |
| | Linux | [Releases](https://github.com/vechain-energy/sync2/releases/latest) |
| Mobile | | |
| | Android | [Google Play](https://play.google.com/store/apps/details?id=org.vechain.sync2) |
| | iOS | [App Store](https://apps.apple.com/app/6446363029) |

## Port dApps to Sync2

You can easily port your dApp by integrating [Connex v2](https://github.com/vechain/connex).

## Build from source 

### Requirements

- Node.js 24 LTS
- npm 10+

### Install the dependencies
```bash
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

* web mode
    ```bash
    npx quasar dev
    ```
* electron mode
    ```bash
    npx quasar dev -m electron
    ```
* ios mode
    ```bash
    npx quasar dev -m ios
    ```
* android mode
    ```bash
    npx quasar dev -m android
    ```

### Lint the files
```bash
npm run lint
```

### Run tests
```bash
npm test
```

### Build the app for production
```bash
npx quasar build
```

## Version release flow

<details>
  <summary>Click to get detail</summary>


### Browser

Browser version will be updated automatically by [Action](./.github/workflows/deploy-pwa-preview.yaml)

### Desktop

+ Bump `<version>` in [package.json](./package.json)
+ `git tag v<version>`
+ `git push origin v<version>`
+ Check [Action](./.github/workflows/release.yaml) for more detailed info.
+ The release workflow creates a draft GitHub Release and uploads built Electron binaries for Windows and macOS.
+ Review the draft release assets, then publish the release manually.
</details>

## License

This package is licensed under the
[GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/lgpl-3.0.html), also included
in *LICENSE* file in the repository.
