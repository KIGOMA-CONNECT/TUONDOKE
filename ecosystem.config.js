module.exports = {
  apps: [
    {
      name: 'tuondoke-api',
      script: 'dist/server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3100
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true
    }
  ]
};
