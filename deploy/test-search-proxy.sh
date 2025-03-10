#!/bin/bash

# Define server details
SERVER_URL="http://143.244.133.154:3003/api/search"

# Display information
echo "Testing RhinoSpider search proxy service..."

# Create a test payload
echo "Creating test payload..."
cat > /tmp/test-payload.json << EOF
{
  "extensionId": "test-extension-id",
  "topics": [
    {
      "id": "test-topic-1",
      "name": "TechCrunch News Articles",
      "keywords": ["startup", "technology", "funding"]
    },
    {
      "id": "test-topic-2",
      "name": "E-commerce Product Monitor",
      "keywords": ["online shopping", "product reviews"]
    }
  ],
  "batchSize": 500
}
EOF

# Send the request
echo "Sending request to $SERVER_URL..."
curl -X POST "$SERVER_URL/urls" \
  -H "Content-Type: application/json" \
  -d @/tmp/test-payload.json | jq '.'

# Clean up
rm /tmp/test-payload.json

echo "Test completed!"
