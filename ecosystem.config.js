module.exports = {
  apps: [
    {
      name: 'kalsohr-api',
      cwd: '/home/kalsohr/apps/kalsohr/kalsohrapi',
      script: 'dist/index.js',
      instances: 2,  // Adjust based on CPU cores (2 for 2-4 core VPS)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
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
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
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
