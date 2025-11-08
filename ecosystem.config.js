// ecosystem.config.js
// PM2 configuration file untuk production deployment

module.exports = {
  apps: [
    // Main API Server
    {
      name: "colivera-api",
      script: "./src/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 4000
      },
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true
    },
    
    // Sensor Sync Cron Job (Optional - jika mau pisah process)
    // Uncomment jika mau jalankan cron di process terpisah
    /*
    {
      name: "sensor-sync-cron",
      script: "./tools/sensor-sync.cron.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        SENSOR_SYNC_INTERVAL: 1 // Sync every 1 minute
      },
      error_file: "./logs/cron-error.log",
      out_file: "./logs/cron-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true
    }
    */
  ]
};
