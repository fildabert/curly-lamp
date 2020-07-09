/* eslint-disable linebreak-style */
/* eslint-disable no-underscore-dangle */
const express = require('express');

const router = express.Router();
const purchaseOrderController = require('../controllers/purchase-order-controller');

const findAllOrders = async (req, res, next) => {
  try {
    const result = await purchaseOrderController.findAllOrders();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const findAllOrdersSupplier = async (req, res, next) => {
  try {
    const result = await purchaseOrderController.findAllOrdersSupplier();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const findAllOrdersSupplierActive = async (req, res, next) => {
  try {
    const result = await purchaseOrderController.findAllOrdersSupplierActive();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const findOneOrder = async (req, res, next) => {
  try {
    const result = await purchaseOrderController.findOneOrder(req.params._id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const searchOrder = async (req, res, next) => {
  try {
    const result = await purchaseOrderController.searchOrder(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const findOrdersDue = async (req, res, next) => {
  try {
    const result = await purchaseOrderController.findOrdersDue();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const result = await purchaseOrderController.createOrder(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const createOrderSupplier = async (req, res, next) => {
  try {
    const result = await purchaseOrderController.createOrderSupplier(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const editOrder = async (req, res, next) => {
  try {
    const result = await purchaseOrderController.editOrder(req.params._id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const patchOrder = async (req, res, next) => {
  try {
    const result = await purchaseOrderController.patchOrder(req.params._id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const deleteOrder = async (req, res, next) => {
  try {
    const result = await purchaseOrderController.deleteOrder(req.params._id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const printOrder = async (req, res, next) => {
  try {
    const payload = {
      orderId: req.params._id,
      startDate: new Date(req.query.startDate),
      endDate: new Date(req.query.endDate),
      dueDate: req.query.dueDate,
    };
    await purchaseOrderController.print(payload, res);
    // res.end();
  } catch (error) {
    next(error);
  }
};

const editOrderSupplier = async (req, res, next) => {
  try {
    if (!req.body.amount) {
      throw Object.assign(new Error('Amount cannot be empty'), { code: 400 });
    }
    const result = await purchaseOrderController.editOrderSupplier(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const printMany = async (req, res, next) => {
  try {
    const payload = {
      orderIds: req.body.orderIds,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      dueDate: req.body.dueDate,
    };
    const result = await purchaseOrderController.printMany(payload);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

router.get('/all', findAllOrders);
router.get('/supplier', findAllOrdersSupplier);
router.get('/supplier/active', findAllOrdersSupplierActive);
router.get('/due', findOrdersDue);
router.get('/search', searchOrder);
router.put('/increase-quota', editOrderSupplier);
router.get('/:_id', findOneOrder);
router.get('/print/:_id', printOrder);
router.post('/printMany', printMany);
router.post('/', createOrder);
router.post('/supplier', createOrderSupplier);
router.put('/:_id', editOrder);
router.patch('/:_id', patchOrder);
router.delete('/:_id', deleteOrder);

module.exports = router;
