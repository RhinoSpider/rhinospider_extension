// server-integration.js
// This script integrates the direct storage endpoints with the existing proxy server

// Load the direct storage endpoints
const { addDirectStorageEndpoints } = require('./integrate-direct-storage');

// Export a function to add the endpoints to an existing Express router
module.exports = function(router) {
  // Add the direct storage endpoints to the router
  addDirectStorageEndpoints(router);
  
  console.log('Direct storage endpoints integrated with proxy server!');
};
