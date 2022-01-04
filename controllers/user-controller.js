/* eslint-disable no-underscore-dangle */
/* eslint-disable no-async-promise-executor */
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user');
const Notification = require('../models/notification');
const { signToken } = require('../helpers/jwt');

const CLIENT_ID = '202223336560-46k4lh950qbhudoi797tfhnqmdmkgpjl.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

module.exports = {
  createUser: ({
    username, email, password, admin = 1,
  }) => new Promise(async (resolve, reject) => {
    try {
      const newUser = new User({
        username,
        email,
        password,
        admin,
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
        throw Object.assign(new Error('Invalid username/password'), {
          code: 400,
        });
      }
      const passwordCheck = await bcrypt.compare(password, user.password);
      if (!passwordCheck) {
        throw Object.assign(new Error('Invalid username/password'), {
          code: 400,
        });
      }
      const payload = {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        admin: user.admin,
      };
      const token = signToken(payload);
      resolve(token);
    } catch (error) {
      reject(error);
    }
  }),
  addNotification: ({ notificationToken, userInfo }) => new Promise(async (resolve, reject) => {
    try {
      const notification = await Notification.findOne({
        token: notificationToken,
      });
      if (!notification) {
        const newNotif = new Notification({ token: notificationToken });
        await newNotif.save();
        resolve({ created: 1 });
      }
      notification.user = userInfo;
      await notification.save();
      resolve({ created: 0 });
    } catch (error) {
      reject(error);
    }
  }),
  googleLogin: (idToken) => new Promise(async (resolve, reject) => {
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: CLIENT_ID,
      });
      const payload = ticket.getPayload();
      console.log(payload);
      const user = await User.findOne({ email: payload.email });
      if (user) {
        const jwtPayload = {
          _id: user._id,
          username: user.username,
          fullName: user.fullName,
          picture: payload.picture,
          email: user.email,
          admin: user.admin,
        };
        const jwtToken = signToken(jwtPayload);
        return resolve(jwtToken);
      }
      // throw Object.assign(new Error('Unauthorized'), { code: 400 });

      const newUser = new User({
        username: payload.name,
        email: payload.email,
        fullName: payload.name,
        password: payload.jti,
        picture: payload.picture,
        admin: 1,
      });

      const userCreated = await newUser.save();

      const jwtPayload = {
        _id: userCreated._id,
        username: userCreated.username,
        email: userCreated.email,
        admin: userCreated.admin,
      };
      const jwtToken = signToken(jwtPayload);
      return resolve(jwtToken);
    } catch (error) {
      return reject(error);
    }
  }),
};
