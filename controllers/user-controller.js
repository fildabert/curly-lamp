/* eslint-disable no-underscore-dangle */
/* eslint-disable no-async-promise-executor */
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { signToken } = require('../helpers/jwt');

module.exports = {
  createUser: ({
    username, email, password, admin = false,
  }) => new Promise(async (resolve, reject) => {
    try {
      const newUser = new User({
        username, email, password, admin,
      });
      await newUser.save();
      resolve(newUser);
    } catch (error) {
      reject(error);
    }
  }),
  login: ({ username, password }) => new Promise(async (resolve, reject) => {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        throw Object.assign(new Error('Invalid username/password'), { code: 400 });
      }
      const passwordCheck = await bcrypt.compare(password, user.password);
      if (!passwordCheck) {
        throw Object.assign(new Error('Invalid username/password'), { code: 400 });
      }
      const payload = {
        _id: user._id,
        username: user.username,
        email: user.email,
        admin: user.admin,
      };
      const token = signToken(payload);
      resolve(token);
    } catch (error) {
      reject(error);
    }
  }),
};
