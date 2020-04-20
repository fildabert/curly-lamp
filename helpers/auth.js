const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.body.user });

    if (!user) {
      throw Object.assign(new Error('Unauthorized'), { code: 400 });
    }
    if (user.admin === false) {
      throw Object.assign(new Error('Unauthorized'), { code: 400 });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = auth;
