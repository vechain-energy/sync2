# Sync2

Sync2 is a VeChain wallet for web, desktop, and mobile.

Use it to hold accounts, sign dApp requests, send assets, manage `.vet` names,
register domains, edit VNS profiles, and swap tokens on VeChain.

## Origin

Sync2 comes from VeChain Sync. It is the successor to Sync v1 and removes the
old built-in dApp browser. dApps connect from normal browsers through
[Connex v2](https://github.com/vechain/connex).

- Upstream project: [vechain/sync2](https://github.com/vechain/sync2)
- This release stream: [vechain-energy/sync2](https://github.com/vechain-energy/sync2)
- Maintainer: VeChain Community

## Product

- Wallets: create or import wallets, including single private-key accounts.
- Hardware: sign with Ledger wallets where supported.
- Signing: review and sign dApp certificates and transactions.
- Names: resolve and show `.vet` and `.vet.domains` names.
- Domains: check `.vet` availability, register names, and set a primary name.
- Profiles: edit VNS avatar, display name, description, email, website, and X handle.
- Swaps: quote active mainnet tokens through VeTrade.vet and BetterSwap.io.
- Fees: show estimated fees, max fee caps, and optional Generic Delegator payment.
- Networks: use VeChain mainnet and testnet public nodes.
- Explorer: open mainnet transactions in VeChainStats.

## Platforms

| Platform | Link |
| --- | --- |
| Browser, nightly unstable | [lite.sync.vecha.in](https://lite.sync.vecha.in) |
| Windows | [Latest release](https://github.com/vechain-energy/sync2/releases/latest) |
| macOS | [Latest release](https://github.com/vechain-energy/sync2/releases/latest) |
| Linux | [Latest release](https://github.com/vechain-energy/sync2/releases/latest) |
| Android | [Google Play](https://play.google.com/store/apps/details?id=org.vechain.sync2) |
| iOS | [App Store](https://apps.apple.com/app/6446363029) |

Unsigned desktop releases are installed from GitHub Releases manually.

## Developers

Requirements:

- Node.js 22.12+; Node.js 24 LTS is recommended.
- npm 10+

Install:

```bash
npm install
```

Run in development:

```bash
npx quasar dev
```

Run desktop development:

```bash
npx quasar dev -m electron
```

Check code:

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
```

Coverage gates are 95% for lines, statements, functions, and branches.

Build:

```bash
npm run build
npm run build:pwa
npm run build:electron
```

## License

Sync2 is licensed under the
[GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/lgpl-3.0.html).
See [LICENSE](./LICENSE).
