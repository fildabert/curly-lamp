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

router.get('/all/buyer', findAllInvoiceBuyer);
router.get('/all/supplier', findAllInvoiceSupplier);
router.patch('/', updateInvoice);
router.patch('/editInvoice', editInvoice);
router.delete('/:_id', deleteInvoice);

module.exports = router;
