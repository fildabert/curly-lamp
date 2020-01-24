/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const Transaction = require('../models/transaction');

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
    if (!req.body.actualAmount) {
      throw Object.assign(new Error('actualAmount is required'), { code: 400, data: req.body });
    }
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

const findOneTransaction = async (req, res, next) => {
  try {
    const result = await transactionController.findOneTransaction(req.params._id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const upload = async (req, res, next) => {
  cloudinary.uploader.upload_stream({ resource_type: 'raw', public_id: req.file.originalname }, (err, result) => {
    if (err) {
      console.log(err);
      res.status(400).json(err.message);
    }

    Transaction.findOne({ _id: req.params._id })
      .then((transaction) => {
        transaction.url = result.secure_url;
        transaction.save();
      })
      .then(() => {
        res.end();
        // res.status(200).json(result.secure_url);
      })
      .catch(next);
  }).end(req.file.buffer);
  res.status(200).json('file upload');
};

router.get('/all', findAllTransactions);
router.get('/:_id', findOneTransaction);
router.post('/', createTransaction);
router.post('/supplier', createTransactionSupplier);
router.put('/:_id', updateTransaction);
router.post('/upload/:_id', multer().single('file'), upload);

module.exports = router;
