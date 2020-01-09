/* eslint-disable no-async-promise-executor */
const PurchaseOrder = require('../models/purchase-order');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const Product = require('../models/product');
const Customer = require('../models/customer');


module.exports = {
  createOrder: ({
    productId,
    customerName,
    customerPhone,
    customerAddress,
    customerId,
    totalAmount,
    ordersCompleted,
    approvedBy,
    dueDate,
    status,
  }) => new Promise(async (resolve, reject) => {
    try {
      const newOrder = new PurchaseOrder({
        productId,
        customerName,
        customerPhone,
        customerAddress,
        customerId,
        transactions: [],
        totalAmount,
        ordersCompleted,
        approvedBy,
        dueDate,
        status,
      });

      await newOrder.save();
      resolve(newOrder);
    } catch (error) {
      reject(error);
    }
  }),

  findOneOrder: (orderId) => new Promise(async (resolve, reject) => {
    try {
      const order = await PurchaseOrder.findOne({ _id: orderId }).populate('transactions').populate('productId').populate('approvedBy');
      if (!order) {
        throw Object.assign(new Error('Purchase Order not found'), { code: 400 });
      }
      resolve(order);
    } catch (error) {
      reject(error);
    }
  }),

  findAllOrders: () => new Promise(async (resolve, reject) => {
    try {
      const orders = await PurchaseOrder.find({}).sort({ created_at: 'desc' }).populate('approvedBy').populate('productId');
      resolve(orders);
    } catch (error) {
      reject(error);
    }
  }),

  findOrdersDue: () => new Promise(async (resolve, reject) => {
    try {
      const orders = await PurchaseOrder.find({ status: 'ACTIVE' }).sort({ dueDate: 'asc' });
      if (!orders || orders.length === 0) {
        throw Object.assign(new Error('There are no orders due'), { code: 400 });
      }
      resolve(orders);
    } catch (error) {
      reject(error);
    }
  }),

  editOrder: (orderId, payload) => new Promise(async (resolve, reject) => {
    const {
      productId,
      customerName,
      customerPhone,
      customerAddress,
      customerId,
      totalAmount,
      ordersCompleted,
      approvedBy,
      dueDate,
    } = payload;

    try {
      const newOrder = await PurchaseOrder.findOne({ _id: orderId });
      if (!newOrder) {
        throw Object.assign(new Error('Order Not Found'), { code: 400 });
      }

      newOrder.productId = productId || newOrder.productId;
      newOrder.customerName = customerName || newOrder.customerName;
      newOrder.customerPhone = customerPhone || newOrder.customerPhone;
      newOrder.customerAddress = customerAddress || newOrder.customerAddress;
      newOrder.customerId = customerId || newOrder.customerId;
      newOrder.totalAmount = totalAmount || newOrder.totalAmount;
      newOrder.ordersCompleted = ordersCompleted || newOrder.ordersCompleted;
      newOrder.approvedBy = approvedBy || newOrder.approvedBy;
      newOrder.dueDate = dueDate || newOrder.dueDate;

      const updatedOrder = await newOrder.save();
      resolve(updatedOrder);
    } catch (error) {
      reject(error);
    }
  }),

  patchOrder: (orderId, payload) => new Promise(async (resolve, reject) => {
    try {
      const order = await PurchaseOrder.findOne({ _id: orderId });
      if (!order) {
        throw Object.assign(new Error('Order not found'), { code: 400 });
      }
      order.status = payload.status;
      const updatedOrder = await order.save();
      resolve(updatedOrder);
    } catch (error) {
      reject(error);
    }
  }),

  searchOrder: (payload) => new Promise(async (resolve, reject) => {
    try {
      const order = await PurchaseOrder.find(payload);
      if (!order || order.length === 0) {
        throw Object.assign(new Error('No results found'), { code: 400 });
      }
      resolve(order);
    } catch (error) {
      reject(error);
    }
  }),
};
