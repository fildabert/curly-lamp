/* eslint-disable no-async-promise-executor */
const PurchaseOrder = require('../models/purchase-order');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const Product = require('../models/product');
const redisCache = require('../redis');


module.exports = {
  createOrder: ({
    productId,
    customerName,
    customerPhone,
    customerAddress,
    customerId,
    totalAmount,
    ordersCompleted = 0,
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

      const product = await Product.findOne({ _id: productId });
      if (!product) {
        throw Object.assign(new Error('Product Not Found'), { code: 400 });
      }

      if (product.stock - totalAmount < 0) {
        throw Object.assign(new Error(`Product stock not enough, stock for ${product.name}: ${product.stock}`), { code: 400 });
      }

      await newOrder.save();
      redisCache.del('purchaseOrder');
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

  findAllOrders: () => new Promise((resolve, reject) => {
    try {
      redisCache.get('purchaseOrder', async (err, cache) => {
        if (cache) {
          resolve(JSON.parse(cache));
        } else {
          const orders = await PurchaseOrder.find({ $or: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }], dueDate: { $gt: new Date() } }).sort({ created_at: 'desc' }).populate('approvedBy').populate('productId');
          redisCache.setex('purchaseOrder', (60 * 60), JSON.stringify(orders));
          resolve(orders);
        }
      });
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

      if (newOrder.totalAmount - newOrder.ordersCompleted > 0) {
        newOrder.status = 'ACTIVE';
      }

      const updatedOrder = await newOrder.save();
      redisCache.del('purchaseOrder');
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
      redisCache.del('purchaseOrder');
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

  deleteOrder: (payload) => new Promise(async (resolve, reject) => {
    try {
      const order = await PurchaseOrder.findOne({ _id: payload });
      if (!order) {
        throw Object.assign(new Error('Purchase Order not found'), { code: 400 });
      }
      order.status = 'DELETED';
      await order.save();
      redisCache.del('purchaseOrder');
      resolve({ success: true, data: order });
    } catch (error) {
      reject(error);
    }
  }),
};
