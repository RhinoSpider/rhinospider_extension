# Deployment

## Digital Ocean Scraper Service Setup

This service acts as an intermediate layer between the Chrome extension and websites, solving consensus issues with IC canister HTTP outcalls.

- **Droplet**: Ubuntu 22.04 LTS, 1GB RAM, 25GB SSD
- **Dependencies**: Docker, Docker Compose, Node.js 18+
- **Configuration**: `docker-compose.yml` and `.env` file.

## IC Proxy Service Setup

The IC Proxy service acts as a middleware between the RhinoSpider extension and the Internet Computer canisters.

- **Server**: Ubuntu 22.04 LTS, Node.js 18+
- **Process Management**: PM2
- **Configuration**: `.env` file with canister IDs and other settings.

## Search Proxy Service Setup

The Search Proxy provides URLs for the RhinoSpider extension by searching DuckDuckGo and processing the results.

- **Server**: Ubuntu 22.04 LTS, Node.js 18+
- **Process Management**: PM2
- **Configuration**: `.env` file with port and API settings.
