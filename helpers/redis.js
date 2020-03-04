const redisCache = require('../redis');

const update = (cacheKey, input, sortBy) => {
  try {
    redisCache.get(cacheKey, (err, cache) => {
      if (err) throw err;
      const data = JSON.parse(cache);

      const index = data.findIndex((datum) => datum._id == input._id);

      if (index === -1) {
        data.push(input);
      } else {
        data[index] = input;
      }
      const sortedData = data.sort((a, b) => new Date(b[sortBy] - a[sortBy]));
      redisCache.setex(cacheKey, (60 * 60), JSON.stringify(sortedData));
      return true;
    });
  } catch (error) {
    console.log('REDIS HELPER ERROR:', error);
    return false;
  }
};

module.exports = {
  update,
};
