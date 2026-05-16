const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  console.error('Erro de conexão Redis:', err.message);
});

module.exports = redis;
