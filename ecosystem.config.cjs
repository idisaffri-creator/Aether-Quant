module.exports = {
  apps: [
    {
      name: "aether",
      script: "./dist/index.js",
      cwd: "/root/aether-energy",
      instances: process.env.PM2_INSTANCES || "max",  // use all CPU cores
      exec_mode: "cluster",
      node_args: ["--env-file=/root/aether-energy/.env"],
      max_memory_restart: "1G",
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,
      env: {
        NODE_ENV: "production",
      },
      out_file: "/root/.pm2/logs/aether-out.log",
      error_file: "/root/.pm2/logs/aether-error.log",
      merge_logs: true,
      time: true,
      // Graceful reload: send SIGINT, wait for app to drain
      kill_signal: "SIGINT",
      // Don't fork too fast (Redis rate limits)
      listen_timeout: 15000,
    },
  ],
};
