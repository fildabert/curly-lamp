/* eslint-disable linebreak-style */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const auth = require('../helpers/auth');

const InvoiceController = require('../controllers/invoice-controller');

const router = express.Router();

const findAllInvoiceBuyer = async (req, res, next) => {
  try {
    const result = await InvoiceController.findAllInvoiceBuyer();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const findAllInvoiceSupplier = async (req, res, next) => {
  try {
    const result = await InvoiceController.findAllInvoiceSupplier();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const updateInvoice = async (req, res, next) => {
  try {
    const result = await InvoiceController.updateInvoice(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const deleteInvoice = async (req, res, next) => {
  try {
    const result = await InvoiceController.deleteInvoice(req.params);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const editInvoice = async (req, res, next) => {
  try {
    const result = await InvoiceController.editInvoice(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const findOneInvoice = async (req, res, next) => {
  try {
    const result = await InvoiceController.findOneInvoice({ _id: req.params._id });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const takeOutDeliveryOrder = async (req, res, next) => {
  try {
    const { invoiceId, transactionId } = req.body;
    const result = await InvoiceController.takeOutDeliveryOrder({ invoiceId, transactionId });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// router.get('/temp', async (req, res, next) => {
//    const result = await InvoiceController.temp();

//    res.status(200).json(result);
// })
router.get('/all/buyer', findAllInvoiceBuyer);
router.get('/all/supplier', findAllInvoiceSupplier);
router.patch('/', updateInvoice);
router.patch('/editInvoice', editInvoice);
router.patch('/takeOutDeliveryOrder', takeOutDeliveryOrder);
router.delete('/:_id', deleteInvoice);
router.get('/:_id', findOneInvoice);

module.exports = router;
