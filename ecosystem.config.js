module.exports = {
  apps: [
    {
      name: 'service-registry',
      cwd: './service-registry',
      script: 'src/index.js',
    },
    {
      name: 'dns-server',
      cwd: './dns-server',
      script: 'src/index.js',
    },
    {
      name: 'user-service',
      cwd: './services/user',
      script: 'src/index.js',
    },
    {
      name: 'task-service',
      cwd: './services/task-service',
      script: 'src/index.js',
    },
    {
      name: 'reminder-service',
      cwd: './services/reminder',
      script: 'src/index.js',
    },
    {
      name: 'notification-service',
      cwd: './services/notification',
      script: 'src/index.js',
    },
    {
      name: 'gateway',
      cwd: './gateway',
      script: 'src/index.js',
    },
    {
        name: 'frontend',
        cwd: './frontend',
        script: 'cmd',
        args: '/c npm start'
      },
  ],
}; 