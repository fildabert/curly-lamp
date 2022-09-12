/* eslint-disable linebreak-style */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const auth = require('../helpers/auth');

const router = express.Router();

const CashflowController = require('../controllers/cashflow-contoller');

const createCashflow = async (req, res, next) => {
  try {
    const result = await CashflowController.createCashFlow(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const findAllCashflow = async (req, res, next) => {
  try {
    const result = await CashflowController.findAllCashFlow();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getBalance = async (req, res, next) => {
  try {
    const result = await CashflowController.getBalance();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const deleteCashFlow = async (req, res, next) => {
  try {
    const result = await CashflowController.deleteCashFlow(req.params);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const editCashFlow = async (req, res, next) => {
  try {
    const result = await CashflowController.editCashFlow({
      _id: req.params._id,
      dateIssued: req.body.dateIssued,
      remarks: req.body.remarks,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

router.get('/all', findAllCashflow);
router.post('/create', createCashflow);
router.get('/balance', getBalance);
router.put('/:_id', editCashFlow);
router.delete('/:_id', deleteCashFlow);

module.exports = router;
