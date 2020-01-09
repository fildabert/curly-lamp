const jwt = require('jsonwebtoken');

const SECRET = 'RAHASIA';

module.exports = {
  decodeToken: (token) => {
    const decoded = jwt.verify(token, SECRET);
    if (decoded !== Error) {
      return decoded;
    }
    throw new Error('Invalid Token');
  },
  signToken: (payload) => {
    const token = jwt.sign(payload, SECRET, { expiresIn: '2 days' });
    return token;
  },
};
