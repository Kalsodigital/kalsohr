module.exports = {
  apps: [
    {
      name: 'kalsohr-api',
      cwd: '/home/kalsohr/apps/kalsohr/kalsohrapi',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Zero-downtime deployment settings
      wait_ready: true,              // Wait for app to signal ready
      listen_timeout: 5000,          // Max wait for ready signal (5s)
      kill_timeout: 5000,            // Graceful shutdown timeout (5s)
      max_restarts: 10,              // Prevent restart loops
      min_uptime: '10s',             // Minimum uptime to consider stable

      error_file: '/home/kalsohr/logs/api-error.log',
      out_file: '/home/kalsohr/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false
    },
    {
      name: 'kalsohr-admin',
      cwd: '/home/kalsohr/apps/kalsohr/kalsohr-admin',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      instances: 2,                  // Changed from 1 to 2 for redundancy
      exec_mode: 'cluster',          // Changed from 'fork' to 'cluster'
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },

      // Zero-downtime deployment settings
      wait_ready: true,
      listen_timeout: 10000,         // Next.js takes longer to start
      kill_timeout: 5000,
      max_restarts: 10,
      min_uptime: '10s',

      error_file: '/home/kalsohr/logs/admin-error.log',
      out_file: '/home/kalsohr/logs/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false
    }
  ]
};
