/* eslint-disable no-underscore-dangle */
/* eslint-disable no-async-promise-executor */
const ExcelJS = require('exceljs');
const PurchaseOrder = require('../models/purchase-order');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const Product = require('../models/product');
const redisCache = require('../redis');


module.exports = {
  createOrder: ({
    productId,
    price,
    customerName,
    customerPhone,
    customerAddress,
    customerId,
    totalAmount,
    ordersCompleted = 0,
    approvedBy,
    PONo,
    // dueDate,
  }) => new Promise(async (resolve, reject) => {
    try {
      const newOrder = new PurchaseOrder({
        productId,
        price,
        customerName,
        customerPhone,
        customerAddress,
        customerId,
        transactions: [],
        totalAmount,
        ordersCompleted,
        approvedBy,
        PONo,
        type: 'BUYER',
        // dueDate,
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

  createOrderSupplier: ({
    productId,
    price,
    customerName,
    customerPhone,
    customerAddress,
    customerId,
    totalAmount,
    ordersCompleted = 0,
    approvedBy,
    PONo,
    // dueDate,
  }) => new Promise(async (resolve, reject) => {
    try {
      const newOrder = new PurchaseOrder({
        productId,
        price,
        customerName,
        customerPhone,
        customerAddress,
        customerId,
        transactions: [],
        totalAmount,
        ordersCompleted,
        approvedBy,
        PONo,
        type: 'SUPPLIER',
        // dueDate,
      });

      const product = await Product.findOne({ _id: productId });
      if (!product) {
        throw Object.assign(new Error('Product Not Found'), { code: 400 });
      }

      product.stock += totalAmount;
      await product.save();
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

  findAllOrders: () => new Promise((resolve, reject) => {
    try {
      redisCache.get('purchaseOrder', async (err, cache) => {
        if (cache) {
          resolve(JSON.parse(cache));
        } else {
          const orders = await PurchaseOrder.find({ $or: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }], type: 'BUYER' }).sort({ created_at: 'desc' }).populate('approvedBy').populate('productId');
          redisCache.setex('purchaseOrder', (60 * 60), JSON.stringify(orders));
          resolve(orders);
        }
      });
    } catch (error) {
      reject(error);
    }
  }),

  findAllOrdersSupplier: () => new Promise(async (resolve, reject) => {
    try {
      const orders = await PurchaseOrder.find({ $or: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }], type: 'SUPPLIER' }).sort({ created_at: 'desc' }).populate('approvedBy').populate('productId');
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
      PONo
      // dueDate,
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
      newOrder.PONo = PONo || newOrder.PONo;
      // newOrder.dueDate = dueDate || newOrder.dueDate;

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

  print: (orderId) => new Promise(async (resolve, reject) => {
    try {
      const purchaseOrder = await (await PurchaseOrder.findOne({ _id: orderId })).populate('productId').populate('transactions').populate('approvedBy');
      if (!purchaseOrder) {
        throw Object.assign(new Error('Puchase Order not found'), { code: 400 });
      }
      const workbook = new ExcelJS.Workbook();
      const book = await workbook.xlsx.readFile(`${process.cwd()}/invoice-template.xlsx`);
      const worksheet = book.getWorksheet('Service Invoice');

      let cell = worksheet.getCell('C10');
      cell.value = purchaseOrder.customerName;

      cell = worksheet.getCell('C11');
      cell.value = purchaseOrder.customerAddress;

      cell = worksheet.getCell('C15');
      cell.value = purchaseOrder._id;

      cell = worksheet.getCell('D15');
      if (purchaseOrder.approvedBy) {
        cell.value = purchaseOrder.approvedBy.username;
      }

      cell = worksheet.getCell('E15');
      cell.value = purchaseOrder.productId.name;

      cell = worksheet.getCell('G15');
      cell.value = purchaseOrder.dueDate;


      book.xlsx.writeFile(`${process.cwd()}/res.xlsx`);
      resolve(book);
    } catch (error) {
      reject(error);
    }
  }),
};
