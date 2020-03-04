const client = require('redis').createClient(process.env.REDIS_URL || 'redis://h:p1a5fe8553018dcc7922b7e3c8f40ac2cc17cfe693d9b2cf320f4e362dacd3c17@ec2-52-0-46-27.compute-1.amazonaws.com:29569');

client.on('connect', (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log('Redis connected');
  }
});

module.exports = client;
