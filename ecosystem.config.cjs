module.exports = {
  apps: [
    {
      name: "aether",
      script: "./dist/index.js",
      cwd: "/root/aether-energy",
      instances: 1,
      exec_mode: "cluster",
      node_args: ["--env-file=/root/aether-energy/.env"],
      max_memory_restart: "512M",
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
    },
  ],
};
