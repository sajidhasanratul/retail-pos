module.exports = {
  apps: [
    {
      name: "pos-backend",
      script: "./backend/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};