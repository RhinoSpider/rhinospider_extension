# Services

## IC Proxy

- **Purpose**: Acts as a middleware between the extension and the Internet Computer canisters.
- **Endpoints**:
    - `/api/health`
    - `/api/profile`
    - `/api/topics`
    - `/api/consumer-submit`
- **Configuration**: `.env` file with canister IDs and other settings.

## Search Proxy

- **Purpose**: Provides URLs for the extension by searching DuckDuckGo and other sources.
- **Endpoints**:
    - `/api/health`
    - `/api/search/urls`
    - `/api/search/quota`
    - `/api/search/report-scrape`
- **Configuration**: `.env` file with port and API settings.

## Scraper Service

- **Purpose**: An intermediary between the extension and websites, solving consensus issues with IC canister HTTP outcalls.
- **Endpoints**:
    - `/api/health`
    - `/api/submit`
- **Configuration**: `.env` file with port and storage settings.
