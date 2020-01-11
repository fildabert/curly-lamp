/* eslint-disable no-underscore-dangle */
const express = require('express');

const router = express.Router();
const productController = require('../controllers/product-controller');

const createProduct = async (req, res, next) => {
  try {
    console.log('CREATE PRODUCT')
    const result = await productController.createProduct(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const findAllProduct = async (req, res, next) => {
  try {
    console.log('FIND PRODUCT')
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

const kontil = async (req, res, next) => {
  try {
    console.log('MASUK');
    res.status(200).json('SUCCESS');
  } catch (error) {
    next(error)
  }
}

router.get('/kontol', kontil);
router.get('/all', findAllProduct);
router.get('/search', searchProduct);
router.get('/:_id', findOneProduct);
router.post('/', createProduct);
router.put('/:_id', editProduct);
router.delete('/:_id', deleteProduct);

module.exports = router;
