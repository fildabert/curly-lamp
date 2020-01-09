const express = require('express');

const router = express.Router();
const transactionController = require('../controllers/transaction-controller');

const createTransaction = async (req, res, next) => {
  try {
    const result = await transactionController.createTransaction(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

router.post('/', createTransaction);

module.exports = router;
