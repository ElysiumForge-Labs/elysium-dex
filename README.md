# elysium-dex

Minimal Uniswap V2 automated market maker for **Kinetiq's Elysium testnet**, with a Next.js frontend for HYPE ↔ USDC swaps, liquidity, and Oxley launch markets.

Part of [ElysiumForge Labs](https://github.com/ElysiumForge-Labs).

> **Independent research repository. Testnet only.** Not affiliated with, endorsed by, or sponsored by Kinetiq, Hyperliquid, GlobalStake, or Oxley. Contracts are unmodified upstream Uniswap V2 plus WETH9; they have not been independently audited. Test tokens have no monetary value.

## Overview

Elysium DEX targets Elysium testnet (chain ID `99801`) for HYPE ↔ USDC trading and liquidity provision, plus a separate page for active Oxley launch markets against Oxy-USDC.

**Features**

- Swaps with price impact, minimum output, slippage presets (0.1%, 0.5%, 1%), and 20-minute deadlines
- Liquidity deposits and withdrawals with transferable LP tokens
- Automatic native HYPE wrapping through the router
- Exact-amount token approvals (never unlimited)
- Transaction simulation before every wallet request
- Wallet discovery through EIP-6963 (MetaMask, Rabby, and other injected wallets)
- Mainnet HYPE/USDC reference price for context only (not an execution oracle)
- Additional testnet pairs and an Oxley markets page

**Stack**

| Layer | Technology |
| --- | --- |
| Contracts | Uniswap V2 core `1.0.1` and periphery `1.1.0-beta.0`, WETH9 |
| Tooling | Foundry `v1.8.3`, solc `0.5.16` / `0.6.6` / `0.8.30` |
| Frontend | Next.js, React, TypeScript, wagmi, viem |
| Testing | Foundry (unit, fuzz, invariant), Node test runner, Playwright |

**Status:** contract deployment and website hosting are pending.

## Getting started

### Prerequisites

- Node.js 22 LTS (minimum 20.9) and npm
- [Foundry](https://getfoundry.sh/) `v1.8.3`

No wallet or private key is needed to build or test.

### Install, test, and run

```sh
npm ci
npm run contracts:build
npm run contracts:test
npm test
npm run typecheck
npm run build
cp web/.env.example web/.env.local
npm run dev
```

Open `http://127.0.0.1:3000`. Until a router address is configured, the app shows a deployment-pending state and transactions are disabled.

### Build notes

- The original V2 compilers are pinned as npm dependencies. Foundry fetches solc `0.8.30` for the test harness automatically.
- `npm run contracts:build` writes ABIs and bytecode to `contracts/artifacts/`. Run it before any Foundry command that deploys V2 artifacts.
- The pair init-code hash is computed from the local build and injected into the router library. Do not mix artifacts from different builds.

## Local demo

Run a complete end-to-end environment on a local Anvil chain. No public-chain transactions are sent.

1. Start Anvil in a separate terminal:

   ```sh
   anvil --host 127.0.0.1 --port 8545 --block-time 1 --silent
   ```

2. Deploy and seed from the project root:

   ```sh
   npm run contracts:build
   (cd contracts && forge build)
   npm run demo:seed
   npm run dev
   ```

The seed script requires chain ID `31337` on loopback. It deploys a wrapper, factory, router, mock USDC, and mock PURR, then seeds a 100 HYPE / 2,000 mock USDC pool and a HYPE/PURR pool using Anvil's unlocked test account. Local addresses are written to the gitignored `web/.env.local`; the script refuses to overwrite non-local settings.

Never import real keys into Anvil. Restart the frontend after changing environment settings.

### Browser tests

With Anvil running and seeded:

```sh
npx playwright install chromium
npm run test:e2e
```

The runner builds and serves a production frontend on port 3100 with an injected local-only test wallet. When finished, stop Anvil and restore testnet settings with `cp web/.env.example web/.env.local`.

## Network and assets

| | |
| --- | --- |
| Chain ID | `99801` |
| Native gas | HYPE |
| RPC | `https://testnet-rpc.elysium.kinetiq.xyz` |
| Bridged test USDC | `0x7D29d8047B905000459c0E80c34a26CeedcB47b2` (6 decimals) |

- The USDC address is verified against the official bridge registry and its mapping to the HyperEVM testnet original.
- The bridge-listed WHYPE is a bridged token. This project deploys its own unmodified WETH9 as the native HYPE wrapper (its on-chain symbol remains `WETH`).
- No public faucet for this exact USDC ERC-20 has been verified. Do not use mainnet USDC or assume HyperCore faucet USDC is the same token.

Verify network assets before configuring a deployment:

```sh
npm run verify:network
npm run verify:network -- --save   # optional: refresh the checked-in evidence snapshot
```

See [network verification](docs/NETWORK.md) and [security and design notes](docs/SECURITY.md).

## Deployment

> No broadcast should occur without explicit approval. Never put a private key in `.env` or on the command line; use an encrypted Foundry keystore or a hardware wallet.

1. **Prepare.** Review network verification, compiler output, and tests. Obtain test HYPE for gas and test USDC for initial liquidity. Copy `.env.example` to `.env`, set `DEPLOYER` to the public address, and set `CONFIRM_TESTNET_ASSETS=true` only after verification.

2. **Dry run** (no `--broadcast`):

   ```sh
   npm run contracts:build
   cd contracts
   forge script script/Deploy.s.sol:Deploy \
     --rpc-url "$ELYSIUM_RPC_URL" --chain-id 99801 \
     --account elysium-testnet --sender "$DEPLOYER" -vvvv
   ```

3. **Review** the four creations (WETH9, factory, Router02, HYPE/USDC pair), gas estimate, USDC provenance, and deployment event. The script does not supply liquidity.

4. **Broadcast** the exact reviewed command with `--broadcast`. Record all addresses and receipts. The factory's fee setter is zero, so protocol fees are permanently disabled.

5. **Verify** the deployment:

   ```sh
   ROUTER_ADDRESS=0x... npm run verify:deployment
   ```

   This checks runtime bytecode, constructor wiring, factory lookup, token pair identities, chain ID, and fee configuration. Standard-JSON inputs for explorer verification are generated in `contracts/artifacts/`.

6. **Configure the frontend.** Set `NEXT_PUBLIC_ROUTER_ADDRESS` in `web/.env.local`, keep local-demo mode off, and rebuild. Seed the pool with a deliberately chosen HYPE/USDC ratio, starting with small amounts, then test both swap directions and a full withdrawal.

The deployment script rejects any chain other than `99801` and checks USDC bytecode, decimals, and parent-chain identity.

## Markets

### Additional pairs

The **Trading pair** selector offers PURR and kmHYPE against HYPE or USDC. kHYPE, KNTQ, and sKNTQ are listed but disabled pending contract verification. The deployed V2 contracts support these pairs without redeployment. New pools stay empty until seeded, and there is no multi-hop routing. See [token verification](docs/TOKENS.md).

### Oxley markets

The `/oxley` page trades active Oxley launches against **Oxy-USDC**, Oxley's separate testnet asset, using Oxley's existing liquidity. See [Oxley integration](docs/OXLEY.md).

### Market reference

The HYPE/USDC price card uses Hyperliquid's public mainnet spot API for context only. It is not an execution oracle. Swap output comes from testnet pool reserves and the 0.30% LP fee, and the first deposit sets each pool's starting price. Stale or unavailable data is hidden.

## Project structure

```
contracts/
  src/Interfaces.sol        Shared Solidity interfaces
  script/Deploy.s.sol       Elysium-only deployment script
  test/                     V2 integration, fuzz, and invariant tests
scripts/
  compile-contracts.mjs     Reproducible upstream compilation
  verify-network.mjs        Read-only asset provenance checks
  verify-deployment.mjs     Read-only deployment integrity checks
  local-demo.mjs            Local Anvil deployment and seeding
web/                        Next.js app, quote math, wallet and transaction flows
e2e/                        Playwright wallet and layout tests
docs/                       Design, verification, and operations notes
```

## Documentation

| Document | Topic |
| --- | --- |
| [SECURITY.md](docs/SECURITY.md) | Contract design, client protections, known limits |
| [NETWORK.md](docs/NETWORK.md) | Network and asset verification |
| [TOKENS.md](docs/TOKENS.md) | Token evidence and pool seeding |
| [VALIDATION.md](docs/VALIDATION.md) | What has and has not been tested |
| [RPC.md](docs/RPC.md) | RPC proxy and fallback behavior |
| [WALLET-RELIABILITY.md](docs/WALLET-RELIABILITY.md) | Wallet connection behavior |
| [LP-FEES.md](docs/LP-FEES.md) | LP fee history |
| [OXLEY.md](docs/OXLEY.md) | Oxley integration |
| [HOSTING.md](docs/HOSTING.md) | Website hosting |
| [ARTWORK.md](docs/ARTWORK.md) | Artwork provenance |

## Security

- Generated builds, caches, broadcast records, local addresses, logs, and environment files are gitignored.
- Never commit private keys, seed phrases, or real `.env` files.
- Liquidity provision carries impermanent loss and MEV exposure. Minimum-output limits protect against execution below your tolerance, not against all MEV.

## License

Solidity sources are licensed under GPL-3.0-or-later, as declared in their SPDX headers. Upstream Uniswap V2 attributions are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
