/* eslint-disable linebreak-style */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const Transaction = require('../models/transaction');
const PurchaseOrder = require('../models/purchase-order');
const Product = require('../models/product');

const auth = require('../helpers/auth');
// const aws = require('../helpers/aws');

const router = express.Router();
const transactionController = require('../controllers/transaction-controller');

const repeatValidation = async (data) => {
  const {
    productId,
    orderId,
    amount,
    orderIdSupplier,
    repeat,
  } = data;
  const checkProduct = await Product.findOne({ _id: productId });
  if (!checkProduct) {
    throw Object.assign(new Error('Product Not Found'), { code: 400 });
  }

  // if (checkProduct.stock - (amount * repeat) <= 0) {
  //   throw Object.assign(new Error(`${checkProduct.name} is out of stock: Stock: ${checkProduct.stock} - the amount you entered: ${amount * repeat}`), { code: 400 });
  // }

  const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId });
  if (!purchaseOrder) {
    throw Object.assign(new Error('Purchase Order not found'), { code: 400 });
  }

  if (purchaseOrder.ordersCompleted + (amount * repeat) > purchaseOrder.totalAmount) {
    throw Object.assign(
      new Error(`You can only repeat this order for a maximum of ${Math.floor((purchaseOrder.totalAmount - purchaseOrder.ordersCompleted) / amount)} times`),
      { code: 400, data: purchaseOrder },
    );
  }

  let purchaseOrderSupplier;
  if (orderIdSupplier) {
    purchaseOrderSupplier = await PurchaseOrder.findOne({ _id: orderIdSupplier });
  } else {
    purchaseOrderSupplier = await PurchaseOrder.findOne({ productId, status: 'ACTIVE', type: 'SUPPLIER' });
  }

  if (!purchaseOrderSupplier) {
    throw Object.assign(new Error(`There is no ongoing Purchase Order (SUPPLIER) for product ${checkProduct.name}`), { code: 400 });
  }

  if (purchaseOrder.ordersCompleted + (amount * repeat) > purchaseOrder.totalAmount) {
    throw Object.assign(new Error('Purchase Order may be completed or the amount you entered is too much'), { code: 400, data: purchaseOrder });
  }

  if (purchaseOrderSupplier.ordersCompleted + (amount * repeat) > purchaseOrderSupplier.totalAmount) {
    throw Object.assign(new Error(`Total quota exceeded, please update Purchase Order (SUPPLIER) for product ${checkProduct.name}`), { code: 400, data: purchaseOrder });
  }
};

const createTransaction = async (req, res, next) => {
  try {
    const { amount, repeat } = req.body;
    if (!amount || +amount <= 0) {
      throw Object.assign(new Error('Validation Errors: Invalid/Incomplete Input'), { code: 400, data: req.body });
    }
    if (Number(repeat) > 0) {
      await repeatValidation(req.body);
      await transactionController.bulkCreate(req.body);
      return res.status(200).json({ success: true });
    }
    const result = await transactionController.createTransaction(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
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
    // if (!req.body.actualAmount) {
    //   throw Object.assign(new Error('actualAmount is required'), { code: 400, data: req.body });
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
        res.status(200).json(result.secure_url);
        // res.end();
      })
      .catch(next);
  }).end(req.file.buffer);
};

const deleteTransaction = async (req, res, next) => {
  try {
    const result = await transactionController.deleteTransaction(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const elasticSearch = async (req, res, next) => {
  try {
    const result = await transactionController.elasticSearch();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};


router.get('/refrez', async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({ _id: '5ef048fe15c2c40007ddb1db' }).populate('transactions');

    purchaseOrder.transactions.forEach((trx) => {
      aws.sendMessage(trx);
    });

    res.status(200).json('o yea');
  } catch (error) {
    res.status(400).json(error);
  }
})

router.get('/all', findAllTransactions);
router.get('/elastic', elasticSearch);
router.get('/:_id', findOneTransaction);
router.post('/', createTransaction);
router.post('/supplier', createTransactionSupplier);
router.put('/:_id', updateTransaction);
router.post('/upload/:_id', multer().single('file'), upload);
router.post('/delete', auth, deleteTransaction);


module.exports = router;
