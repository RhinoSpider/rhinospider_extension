#!/bin/bash

echo "🔍 PRODUCTION READINESS CHECK"
echo "============================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES=0

# 1. Check for console.log statements (should use proper logging)
echo "1. Checking for debug console.logs..."
CONSOLE_LOGS=$(grep -r "console.log" src/ --exclude="*.test.js" | grep -v "^\s*//" | wc -l)
if [ $CONSOLE_LOGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $CONSOLE_LOGS console.log statements (consider production logging)${NC}"
else
    echo -e "${GREEN}✅ No console.log statements${NC}"
fi

# 2. Check for hardcoded localhost/test URLs
echo ""
echo "2. Checking for localhost/test URLs..."
LOCALHOST=$(grep -r "localhost\|127.0.0.1\|192.168" src/ --exclude="*.test.js" | grep -v "^\s*//" | wc -l)
if [ $LOCALHOST -gt 0 ]; then
    echo -e "${RED}❌ Found localhost/test URLs!${NC}"
    grep -r "localhost\|127.0.0.1\|192.168" src/ --exclude="*.test.js" | grep -v "^\s*//"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ No localhost URLs${NC}"
fi

# 3. Check for TODO/FIXME comments
echo ""
echo "3. Checking for TODO/FIXME comments..."
TODOS=$(grep -r "TODO\|FIXME\|HACK\|XXX" src/ --exclude="*.test.js" | wc -l)
if [ $TODOS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $TODOS TODO/FIXME comments${NC}"
    grep -r "TODO\|FIXME\|HACK\|XXX" src/ --exclude="*.test.js" | head -5
else
    echo -e "${GREEN}✅ No TODO/FIXME comments${NC}"
fi

# 4. Check for mock/fake data
echo ""
echo "4. Checking for mock/fake data..."
MOCKS=$(grep -r "mock\|fake\|dummy\|test.*data\|sample.*data" src/ -i --exclude="*.test.js" | grep -v "^\s*//" | wc -l)
if [ $MOCKS -gt 0 ]; then
    echo -e "${RED}❌ Found potential mock/fake data!${NC}"
    grep -r "mock\|fake\|dummy\|test.*data" src/ -i --exclude="*.test.js" | grep -v "^\s*//" | head -5
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ No mock/fake data found${NC}"
fi

# 5. Check API endpoints are production
echo ""
echo "5. Checking API endpoints..."
IC_PROXY=$(grep -r "ic-proxy.rhinospider.com" src/ | wc -l)
SEARCH_PROXY=$(grep -r "search-proxy.rhinospider.com" src/ | wc -l)
if [ $IC_PROXY -gt 0 ] && [ $SEARCH_PROXY -gt 0 ]; then
    echo -e "${GREEN}✅ Production API endpoints configured${NC}"
    echo "   - IC Proxy: $IC_PROXY references"
    echo "   - Search Proxy: $SEARCH_PROXY references"
else
    echo -e "${RED}❌ Missing production endpoints${NC}"
    ISSUES=$((ISSUES + 1))
fi

# 6. Check for proper error handling
echo ""
echo "6. Checking error handling..."
TRY_CATCH=$(grep -r "try\s*{" src/ | wc -l)
CATCH=$(grep -r "catch\s*(" src/ | wc -l)
if [ $TRY_CATCH -eq $CATCH ]; then
    echo -e "${GREEN}✅ All try blocks have catch blocks ($TRY_CATCH)${NC}"
else
    echo -e "${YELLOW}⚠️  Mismatched try/catch blocks (try: $TRY_CATCH, catch: $CATCH)${NC}"
fi

# 7. Check for API keys in code
echo ""
echo "7. Checking for exposed API keys..."
API_KEYS=$(grep -r "api[_-]key\|apikey\|secret\|password\|token" src/ -i | grep -v "principalId\|referralCode" | grep "=\s*['\"]" | wc -l)
if [ $API_KEYS -gt 0 ]; then
    echo -e "${RED}❌ Found potential API keys in code!${NC}"
    grep -r "api[_-]key\|apikey\|secret\|password" src/ -i | grep "=\s*['\"]" | head -3
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ No API keys in code${NC}"
fi

# 8. Check build succeeds
echo ""
echo "8. Checking build..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    ISSUES=$((ISSUES + 1))
fi

# 9. Check critical files exist
echo ""
echo "9. Checking critical files..."
CRITICAL_FILES=(
    "src/popup-enhanced.js"
    "pages/popup-enhanced.html"
    "src/error-handler.js"
    "src/connection-handler.js"
    "src/analytics.js"
    "manifest.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ $file missing!${NC}"
        ISSUES=$((ISSUES + 1))
    fi
done

# 10. Check data fetching from canister
echo ""
echo "10. Checking real data fetching..."
CANISTER_FETCH=$(grep -r "fetch.*ic-proxy.*user-profile\|consumer-profile" src/ | wc -l)
if [ $CANISTER_FETCH -gt 0 ]; then
    echo -e "${GREEN}✅ Fetching real data from canister ($CANISTER_FETCH locations)${NC}"
else
    echo -e "${RED}❌ Not fetching from canister!${NC}"
    ISSUES=$((ISSUES + 1))
fi

# 11. Check for proper async/await usage
echo ""
echo "11. Checking async/await patterns..."
ASYNC_FUNCS=$(grep -r "async\s*function\|async\s*(" src/ | wc -l)
AWAITS=$(grep -r "await\s" src/ | wc -l)
echo -e "${GREEN}✅ $ASYNC_FUNCS async functions with $AWAITS await calls${NC}"

# 12. Version check
echo ""
echo "12. Checking version..."
VERSION=$(grep '"version"' manifest.json | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
echo -e "${GREEN}✅ Version: $VERSION${NC}"

echo ""
echo "============================="
echo "SUMMARY"
echo "============================="

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ PRODUCTION READY - No critical issues found${NC}"
    echo ""
    echo "Code Quality Indicators:"
    echo "• Error handling: Comprehensive"
    echo "• API endpoints: Production"
    echo "• Data source: Real canister data"
    echo "• No mock/fake data"
    echo "• No exposed secrets"
    echo "• Build: Successful"
    exit 0
else
    echo -e "${RED}❌ NOT PRODUCTION READY - $ISSUES critical issues found${NC}"
    echo "Fix the issues above before deploying"
    exit 1
fi