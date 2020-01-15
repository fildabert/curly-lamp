const client = require('redis').createClient(process.env.REDIS_URL);

client.on('connect', (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log('Redis connected');
  }
});

module.exports = client;
