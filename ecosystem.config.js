// PM2 Ecosystem Config for WhatsApp SaaS
// Place at /opt/whatsapp-saas/ecosystem.config.js
// Start: pm2 start ecosystem.config.js
// Restart: pm2 restart all
// Logs: pm2 logs

module.exports = {
  apps: [
    {
      name: 'wa-saas-backend',
      cwd: './backend',
      script: 'src/app.js',
      instances: 1, // Use 1 for Socket.IO sticky sessions; increase with cluster adapter
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      env_file: './backend/.env',
      max_memory_restart: '512M',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'wa-saas-frontend',
      cwd: './frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        NEXT_PUBLIC_API_URL: 'https://app.karssoft.com/api/v1',
        NEXT_PUBLIC_SOCKET_URL: 'https://app.karssoft.com',
      },
      max_memory_restart: '512M',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
