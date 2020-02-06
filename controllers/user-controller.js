/* eslint-disable no-underscore-dangle */
/* eslint-disable no-async-promise-executor */
const bcrypt = require('bcryptjs');
const { CronJob } = require('cron');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user');
const Notification = require('../models/notification');
const { signToken } = require('../helpers/jwt');

const CLIENT_ID = '202223336560-46k4lh950qbhudoi797tfhnqmdmkgpjl.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);


// eslint-disable-next-line no-new
new CronJob('0 */6 * * *', (async () => {
  try {
    const notifications = await Notification.find({});
    const notifArr = [];
    notifications.forEach((notif) => {
      notifArr.push(notif.token);
    });
    if (notifArr.length > 0) {
      const { data } = axios({
        method: 'POST',
        url: 'https://fcm.googleapis.com/fcm/send',
        headers: {
          'content-type': 'application/json',
          authorization: 'Key=AAAA9F7jSX4:APA91bH_l-ixlMX-EaPD27A7PbrswP67Xzy3XwmlDmtelQMDDQRCmvl1QfV2KbBhDAB_mgU2TyLovmPcRSJzv_O0o8yCp10n5rjnCy2Q-N780Ofu0n9FGxkJgX089yFCsNyk7QFWw4yr',
        },
        data: {
          notification: {
            title: 'hello',
            body: 'my name a uvuvwevwevwe onyetenyevwe ugwemubwem osas',
            icon: 'https://cdn-image.hipwee.com/wp-content/uploads/2016/12/hipwee-00138315.jpg',
          },
          registration_ids: notifArr,
        },
      });
    }
  } catch (error) {
    console.log(error);
  }
}), null, true);

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
  addNotification: ({ notificationToken, userInfo }) => new Promise(async (resolve, reject) => {
    try {
      const notification = await Notification.findOne({ token: notificationToken });
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
      const user = await User.findOne({ email: payload.email });
      if (user) {
        const jwtPayload = {
          _id: user._id,
          username: user.username,
          email: user.email,
          admin: user.admin,
        };
        const jwtToken = signToken(jwtPayload);
        return resolve(jwtToken);
      }
      const newUser = new User({
        username: payload.name,
        email: payload.email,
        password: payload.jti,
        admin: false,
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
