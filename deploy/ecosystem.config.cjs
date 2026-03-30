module.exports = {
  apps: [
    {
      name: 'helena-backend',
      script: 'src/server.js',
      cwd: '/opt/diario/backend',

      // Node.js com suporte a ESM
      node_args: '--experimental-vm-modules',

      // Variáveis de ambiente de produção
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        ALLOWED_ORIGIN: 'https://SEU_DOMINIO',
        DB_PATH: '/opt/diario/data/helena.db',
      },

      // Reinicia automaticamente se crashar
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',

      // Logs
      out_file: '/opt/diario/logs/backend-out.log',
      error_file: '/opt/diario/logs/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
}
