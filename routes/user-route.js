const express = require('express');

const router = express.Router();
const userController = require('../controllers/user-controller');


const createUser = async (req, res, next) => {
  const {
    username,
    email,
    password,
  } = req.body;

  try {
    const newUser = await userController.createUser({ username, email, password });
    res.status(200).json(newUser);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  if (!req.body.username || !req.body.password) {
    res.status(400).json('username/password must be provided');
  }

  const { username, password } = req.body;

  try {
    const token = await userController.login({ username, password });
    res.status(200).json(token);
  } catch (error) {
    next(error);
  }
};

const addNotification = async (req, res, next) => {
  try {
    const result = await userController.addNotification(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const result = await userController.googleLogin(req.body.idToken);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

router.post('/register', createUser);
router.post('/login', login);
router.post('/googlelogin', googleLogin);
router.get('/notificationtoken', addNotification);

module.exports = router;
