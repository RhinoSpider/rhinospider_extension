# RhinoSpider Extension Testing Instructions

## Overview
This document provides instructions for testing the RhinoSpider extension, focusing on the search proxy client and submission endpoints. These tests will verify that the extension can correctly fetch URLs for topics and submit scraped data according to the proxy architecture.

## Proxy Architecture
The RhinoSpider extension uses two separate proxy servers:

1. **IC Proxy** (ic-proxy.rhinospider.com)
   - Handles profile, topics, and consumer-submit endpoints
   - Endpoints: `/api/health`, `/api/profile`, `/api/topics`, `/api/consumer-submit`
   - Used for user profile, device registration, and data submission

2. **Search Proxy** (search-proxy.rhinospider.com)
   - Handles search functionality only
   - Endpoints: `/api/health`, `/api/search`
   - Used for fetching URLs for topics

## Testing the Search Proxy Client

1. **Load the extension in Chrome**:
   - Go to chrome://extensions
   - Enable "Developer mode" (top right)
   - Click "Load unpacked" and select the "build" folder

2. **Open the background page console**:
   - Find "RhinoSpider" in the extensions list
   - Click "Details"
   - Under "Inspect views", click "background.html" or "service worker"

3. **Run the search proxy test**:
   - Type: `rhinoSpiderDebug.testSearchProxy()`
   - Press Enter

4. **Review the test results in the console**:
   - Check if the health check was successful
   - Verify if URLs were returned for the test topics
   - Look for any errors in the console

## Testing the Submission Endpoint

1. **Test device registration**:
   - Type: `rhinoSpiderDebug.testRegistration()`
   - Press Enter
   - Verify that the device is successfully registered with the IC Proxy

2. **Test data submission**:
   - Type: `rhinoSpiderDebug.testSubmission()`
   - Press Enter
   - Check if both direct and consumer submission methods work
   - Verify that the data is successfully submitted to the IC Proxy

## Expected Results

### Search Proxy Test
The test should return a result object with:
- `success`: Boolean indicating if the test was successful
- `healthCheck`: Boolean indicating if the health check was successful
- `topicsWithUrls`: Number of topics that received URLs
- `totalUrlsReturned`: Total number of URLs returned across all topics

### Registration Test
The test should return a result object with:
- `success`: Boolean indicating if registration was successful
- `deviceId`: The device ID used for registration
- `message`: Success message

### Submission Test
The test should return a result object with:
- `success`: Boolean indicating if the test was successful
- `directSubmission`: Object with results of direct submission
- `consumerSubmission`: Object with results of consumer submission

## Troubleshooting

If the tests fail, check the following:

1. **Network Issues**:
   - Verify that both proxy servers are running and accessible
   - Check for CORS errors in the console
   - Ensure the correct endpoints are being used for each proxy

2. **Authentication Issues**:
   - Verify that the API password is correct
   - Check if the device registration is successful

3. **Response Format Issues**:
   - Look for any errors related to parsing responses
   - Check if the responses match the expected format

## Next Steps

After successful testing, the extension should be ready for production use. The search proxy client will fetch real URLs for topics, and the submission endpoint will correctly submit scraped data to the IC Proxy.
