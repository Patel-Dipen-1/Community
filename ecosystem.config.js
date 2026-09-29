module.exports = {
  apps: [
    {
      name: 'b2b-api-engine',
      script: 'apps/api/dist/server.js',
      instances: 'max', // Scale across available CPU cores (e.g. 2 cores on 2 vCPU VPS)
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      max_memory_restart: '800M', // Soft memory ceiling per worker process
      kill_timeout: 5000,         // Wait 5s for graceful HTTP/Socket.IO/Prisma shutdown
      listen_timeout: 8000,       // Process boot timeout limit
      restart_delay: 2000,        // Prevent CPU spinning on crash loops
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
