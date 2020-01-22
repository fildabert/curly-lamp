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
    if (!req.body.actualAmount || !req.body.invoice) {
      throw Object.assign(new Error('actualAmount and invoice is required'), { code: 400, data: req.body });
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
  console.log(req.file);
  cloudinary.uploader.upload_stream({ resource_type: 'raw', public_id: req.file.originalname }, (err, result) => {
    if (err) {
      console.log(err);
      res.status(400).json(err.message);
    }

    Transaction.findOne({_id: req.params._id})
      .then(transaction => {
        transaction.url = result.secure_url;
        transaction.save();
      })
      .then(result => {
        res.end();
        // res.status(200).json(result.secure_url);
      })
      .catch(next);

    console.log(result);
  }).end(req.file.buffer);
  // cloudinary.uploader.upload(`data:${req.file.mimetype};${req.file.encoding},${req.file.buffer.toString('base64')}`,
  //   { resource_type: 'raw', public_id: req.file.originalName },
  //   (err, result) => {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       console.log(result);
  //     }
  //   });
  res.status(200).json('suces');
};

router.get('/all', findAllTransactions);
router.get('/:_id', findOneTransaction);
router.post('/', createTransaction);
router.post('/supplier', createTransactionSupplier);
router.put('/:_id', updateTransaction);
router.post('/upload/:_id', multer().single('file'), upload);

module.exports = router;
