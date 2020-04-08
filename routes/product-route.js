/* eslint-disable no-underscore-dangle */
const express = require('express');
const auth = require('../helpers/auth');

const router = express.Router();
const productController = require('../controllers/product-controller');

const createProduct = async (req, res, next) => {
  try {
    const result = await productController.createProduct(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const findAllProduct = async (req, res, next) => {
  try {
    const result = await productController.findAllProduct();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const findOneProduct = async (req, res, next) => {
  try {
    const result = await productController.findOneProduct(req.params._id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const editProduct = async (req, res, next) => {
  try {
    const result = await productController.editProduct(req.params._id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const result = await productController.deleteProduct(req.params._id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const searchProduct = async (req, res, next) => {
  try {
    const result = await productController.searchProduct(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

router.get('/all', findAllProduct);
router.get('/search', searchProduct);
router.get('/:_id', findOneProduct);
router.post('/', auth, createProduct);
router.put('/:_id', auth, editProduct);
router.delete('/:_id', auth, deleteProduct);

module.exports = router;
