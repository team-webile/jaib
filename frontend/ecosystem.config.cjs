/** @type {import('next').NextConfig} */
module.exports = {
  apps: [{
    name: process.env.PM2_APP_NAME || 'jaib-frontend',
    script: 'server.js',
    cwd: __dirname,
    instances: parseInt(process.env.PM2_INSTANCES || '4', 10),
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.jaib.co',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://jaib.co',
      BACKEND_INTERNAL_URL: process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000/api',
    },
    max_memory_restart: '512M',
    autorestart: true,
    watch: false,
  }],
};
