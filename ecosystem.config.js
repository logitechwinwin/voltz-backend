module.exports = {
  apps: [
    {
      name: "voltz",
      exec_mode: "fork",
      instances: 1, // Or a number of instances
      script: "./dist/src/main.js",
      args: "start",
      port: 3000,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        APP_ENV: "producion", // APP_ENV=prod
        NODE_ENV: "production",
      },
    },
  ],
};
