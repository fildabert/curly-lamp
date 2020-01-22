/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
const express = require('express');

const router = express.Router();
const transactionController = require('../controllers/transaction-controller');

const createTransaction = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || +amount <= 0) {
      throw Object.assign(new Error('Validation Errors: Invalid/Incomplete Input'), { code: 400, data: req.body });
    }
    const result = await transactionController.createTransaction(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const createTransactionSupplier = async (req, res, next) => {
  try {
    const { amount, invoice } = req.body;
    if (!amount || !invoice || +amount <= 0) {
      throw Object.assign(new Error('Validation Errors: Invalid/Incomplete Input'), { code: 400, data: req.body });
    }
    const result = await transactionController.createTransactionSupplier(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const updateTransaction = async (req, res, next) => {
  try {
    // if (!req.body.actualAmount || !req.body.invoice) {
    //   throw Object.assign(new Error('actualAmount and invoice is required'), { code: 400, data: req.body });
    // }
    const result = await transactionController.updateTransaction({ transactionId: req.params._id, ...req.body });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const findAllTransactions = async (req, res, next) => {
  try {
    const result = await transactionController.findAllTransactions();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

router.get('/all', findAllTransactions);
router.post('/', createTransaction);
router.post('/supplier', createTransactionSupplier);
router.put('/:_id', updateTransaction);

module.exports = router;
