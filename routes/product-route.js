/* eslint-disable no-underscore-dangle */
const express = require('express');
const { CronJob } = require('cron');
const auth = require('../helpers/auth');

const router = express.Router();
const productController = require('../controllers/product-controller');

const isToday = (someDate) => {
  const today = new Date();
  return (
    someDate.getDate() === today.getDate()
    && someDate.getMonth() === today.getMonth()
    && someDate.getFullYear() === today.getFullYear()
  );
};

// eslint-disable-next-line no-new
new CronJob(
  '0 * * * *',
  async () => {
    try {
      console.log('running CRON');
      const promises = [];
      const products = await productController.findAllProduct();
      for (let i = 0; i < products.length; i += 1) {
        const product = products[i];
        if (
          product.scheduledPriceChanges
          && product.scheduledPriceChanges.length > 0
        ) {
          const nextSchedule = product.scheduledPriceChanges[0];
          if (isToday(new Date(nextSchedule.date))) {
            console.log('FUK YEA CRON');
            promises.push(
              productController.editProduct(product._id.toString(), {
                price: nextSchedule.futurePrice,
              }).then(() => {
                productController.removeSchedule(
                  product._id.toString(),
                  nextSchedule._id.toString(),
                );
              }),
            );
          }
        }
      }
      await Promise.all(promises);
    } catch (error) {
      console.log(error);
    }
  },
  null,
  true,
);

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
    const result = await productController.editProduct(
      req.params._id,
      req.body,
    );
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

const removeSchedule = async (req, res, next) => {
  try {
    const result = await productController.removeSchedule(
      req.params._id,
      req.body.scheduleId,
    );
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
router.put('/removeSchedule/:_id', removeSchedule);

module.exports = router;
