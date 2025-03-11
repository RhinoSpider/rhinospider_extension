module.exports = {
  apps: [
    {
      name: 'direct-storage-server',
      script: 'direct-storage-server.js',
      env: {
        NODE_ENV: 'production',
        DIRECT_PORT: 3002,
        PROXY_HOST: 'localhost',
        PROXY_PORT: 3001,
        API_PASSWORD: 'ffGpA2saNS47qr'
      }
    }
  ]
};
