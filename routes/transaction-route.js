const express = require('express');

const router = express.Router();
const transactionController = require('../controllers/transaction-controller');

const createTransaction = async (req, res, next) => {
  try {
    const { amount, sellingPrice } = req.body;
    if (!amount || !sellingPrice || +sellingPrice <= 0 || +amount <= 0) {
      throw Object.assign(new Error('Validation Errors: Invalid/Incomplete Input'), { code: 400, data: req.body });
    }
    const result = await transactionController.createTransaction(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

router.post('/', createTransaction);

module.exports = router;
