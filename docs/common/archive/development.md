# Local Development Setup

## Prerequisites

- Node.js 18+
- npm 8+ or yarn
- Chrome browser
- Git
- Docker and Docker Compose (optional)

## Extension Setup

1.  Install dependencies: `npm install`
2.  Configure `.env` file.
3.  Build with `npm run dev` or `npm run build`.
4.  Load the `dist` directory as an unpacked extension in Chrome.

## IC Proxy Setup

1.  Install dependencies: `npm install`
2.  Configure `.env` file with canister IDs and other settings.
3.  Start the server with `npm run dev` or `npm start`.

## Local Canister Setup

1.  Install DFINITY SDK.
2.  Start the local Internet Computer: `dfx start --background`
3.  Deploy canisters: `dfx deploy --network=local`
4.  Update the IC Proxy `.env` file with the new canister IDs.
