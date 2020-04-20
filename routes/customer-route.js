/* eslint-disable no-underscore-dangle */
const express = require('express');
const auth = require('../helpers/auth');

const router = express.Router();
const customerController = require('../controllers/customer-controller');

const findAllCustomer = async (req, res, next) => {
  try {
    const result = await customerController.findAllCustomer();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    if (!req.body.name) {
      throw Object.assign(new Error('Customer Name is required'), { code: 400 });
    }
    const result = await customerController.createCustomer(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const editCustomer = async (req, res, next) => {
  try {
    const customerId = req.params._id;
    const result = await customerController.editCustomer(customerId, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const customerId = req.params._id;
    const result = await customerController.deleteCustomer(customerId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const result = await customerController.refreshCustomer();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

router.get('/all', findAllCustomer);
router.post('/', createCustomer);
router.put('/:_id', editCustomer);
router.delete('/:_id', deleteCustomer);
router.get('/refreshcustomer', refresh);

module.exports = router;
