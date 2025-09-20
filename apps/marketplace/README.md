# RhinoSpider Enterprise Marketplace

Enterprise-grade data marketplace built on Internet Computer Protocol (ICP).

## Features

### For Enterprises
- **Dataset Catalog**: Browse comprehensive datasets across multiple categories
- **Flexible Access**: Choose between one-time download or API access
- **Sample Preview**: View dataset samples before purchase
- **Secure Authentication**: Login with Internet Identity v2
- **Dashboard**: Manage purchases and API keys
- **Multiple Payment Options**: Pay with ICP, ckBTC, or ckETH

### Dataset Categories
- E-commerce transactions
- Weather patterns
- Financial markets
- Social media analytics
- Healthcare data
- And more...

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Authentication**: Internet Identity v2
- **Backend**: Motoko canisters on ICP
- **Payment**: ICP tokens

## Development

### Prerequisites
- Node.js 18+
- DFX CLI
- Internet Identity setup

### Setup

1. Install dependencies:
```bash
cd apps/marketplace
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## Deployment

### Deploy to ICP

1. Build the frontend:
```bash
npm run build
```

2. Deploy using the deployment script:
```bash
../../deploy-marketplace.sh [admin-principal]
```

3. The script will:
   - Deploy the marketplace backend canister
   - Deploy the frontend assets
   - Initialize the marketplace
   - Output the canister IDs and URL

### Manual Deployment

1. Deploy backend canister:
```bash
cd canisters
dfx deploy marketplace --network ic-prod
```

2. Deploy frontend assets:
```bash
dfx deploy marketplace_assets --network ic-prod
```

3. Initialize:
```bash
dfx canister --network ic-prod call marketplace init
```

## API Integration

### Using the API

```javascript
const API_KEY = 'your_api_key';
const API_URL = 'https://api.rhinospider.io/v1';

// Fetch dataset
fetch(`${API_URL}/datasets/data`, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

### Rate Limits
- Default: 1000 requests per API key
- Enterprise: Custom limits available

## Architecture

```
apps/marketplace/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── lib/            # Core libraries (auth)
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API services
│   ├── types/          # TypeScript types
│   └── styles/         # Global styles
├── public/             # Static assets
└── dist/              # Built files
```

## Canister Architecture

- **marketplace**: Backend logic for dataset management, purchases, and API keys
- **marketplace_assets**: Frontend assets served via ICP
- **storage**: Shared storage canister (existing)
- **admin**: Admin management canister (existing)

## Security

- All authentication via Internet Identity v2
- Secure payment processing on-chain
- API keys with rate limiting
- Admin-only dataset creation

## Support

For enterprise support, contact: enterprise@rhinospider.io