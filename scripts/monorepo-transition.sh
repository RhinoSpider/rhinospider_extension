#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting monorepo transition...${NC}"

# 1. Backup current state
echo -e "${GREEN}Backing up current state...${NC}"
git add .
git commit -m "backup: save state before monorepo transition"
git push origin main

# 2. Create new branch
echo -e "${GREEN}Creating new branch for transition...${NC}"
git checkout -b feature/monorepo-transition

# 3. Create new directory structure
echo -e "${GREEN}Creating new directory structure...${NC}"
mkdir -p apps/extension packages/{common,api-client,web3-client}/src services/{api-gateway,auth,analytics,billing,storage}/src

# 4. Move current extension files
echo -e "${GREEN}Moving extension files...${NC}"
git mv extension/* apps/extension/

# 5. Create new .gitignore
echo -e "${GREEN}Creating new .gitignore...${NC}"
cat > .gitignore << EOL
# Dependencies
node_modules
.pnpm-store

# Build
dist
build
.next

# Environment
.env
.env.*
!.env.example

# IDE
.idea
.vscode

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# DFX
.dfx/

# Turbo
.turbo

# Testing
coverage

# OS
.DS_Store
*.pem

# Debug
.pnpm-debug.log*

# Local env files
.env*.local

# Typescript
*.tsbuildinfo
EOL

# 6. Add husky pre-commit hook
echo -e "${GREEN}Setting up Git hooks...${NC}"
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "pnpm lint-staged"

# 7. Create lint-staged config
cat > .lintstagedrc.json << EOL
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ]
}
EOL

# 8. Add new monorepo files
echo -e "${GREEN}Adding monorepo configuration files...${NC}"
git add package.json pnpm-workspace.yaml turbo.json dfx.json .gitignore .lintstagedrc.json

# 9. Commit changes
echo -e "${GREEN}Committing changes...${NC}"
git commit -m "refactor: transition to monorepo structure

- Move extension to apps/extension
- Add monorepo configuration
- Set up workspace structure
- Configure build tools
- Add Git hooks"

echo -e "${YELLOW}Transition complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review changes: git status"
echo "2. Test build: pnpm install && pnpm build"
echo "3. Push changes: git push origin feature/monorepo-transition"
echo "4. Create pull request on GitHub"
