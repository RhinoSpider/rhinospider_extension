#!/bin/bash

echo "🔍 Checking Admin Access for RhinoSpider System"
echo "================================================"

# Admin principals
ADMIN1="t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae"
ADMIN2="m2x6b-rijrs-nmddl-i4o4z-x2ymi-5equa-cgtmd-y5pag-6f6p4-plfjj-vae"

echo ""
echo "📋 Admin Principals:"
echo "  Admin 1: $ADMIN1"
echo "  Admin 2: $ADMIN2"

echo ""
echo "🔐 Getting all authorized users from backend..."
dfx canister call wvset-niaaa-aaaao-a4osa-cai get_users --network ic

echo ""
echo "================================================"
echo "✅ Both admins should appear in the list above"
echo ""
echo "📌 Admin Capabilities:"
echo "  - Frontend Access: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/"
echo "  - Backend Access: Topic management, AI config, user management"
echo "  - Create Topics: Full CRUD operations on topics"
echo "  - AI Settings: Configure global AI settings"
echo "  - User Management: Add/remove other users"
echo ""
echo "================================================"
echo ""
echo "📝 To test access:"
echo "1. Login to https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/"
echo "2. Try creating a test topic"
echo "3. Check AI configuration settings"
echo ""