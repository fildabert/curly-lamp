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


router.post('/register', createUser);
router.post('/login', login);

module.exports = router;
