/* eslint-disable newline-per-chained-call */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-async-promise-executor */
const ExcelJS = require('exceljs');
const cloudinary = require('cloudinary').v2;
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
    dueDate,
  }) => new Promise(async (resolve, reject) => {
    try {
      const product = await Product.findOne({ _id: productId });
      if (!product) {
        throw Object.assign(new Error('Product Not Found'), { code: 400 });
      }
      const newOrder = new PurchaseOrder({
        productId,
        price: product.price,
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
        dueDate,
      });

      product.stock += Number(totalAmount);
      await product.save();
      await newOrder.save();
      redisCache.del('purchaseOrder');
      redisCache.del('products');

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
          const orders = await PurchaseOrder.find({ $or: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }], type: 'BUYER' }).sort({ createdAt: 'desc' }).populate('transactions').populate('approvedBy').populate('productId');
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
      const orders = await PurchaseOrder.find({ $or: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }], type: 'SUPPLIER' }).sort({ createdAt: 'desc' }).populate('approvedBy').populate('productId');
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
      PONo,
      price,
      // dueDate,
    } = payload;

    try {
      const newOrder = await PurchaseOrder.findOne({ _id: orderId });
      if (!newOrder) {
        throw Object.assign(new Error('Order Not Found'), { code: 400 });
      }

      newOrder.productId = productId || newOrder.productId;
      newOrder.price = price || newOrder.price;
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

  print: (payload, res) => new Promise(async (resolve, reject) => {
    try {
      const { orderId, startDate, endDate } = payload;
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId }).populate('productId').populate('transactions', null, { dateDelivered: { $gte: startDate, $lte: endDate }, status: 'COMPLETED' }).populate('approvedBy');
      if (!purchaseOrder) {
        throw Object.assign(new Error('Puchase Order not found'), { code: 400 });
      }

      if (purchaseOrder.transactions.length === 0) {
        throw Object.assign(new Error(`No invoice found between ${startDate} to ${endDate}`), { code: 400 });
      }
      const workbook = new ExcelJS.Workbook();
      const book = await workbook.xlsx.readFile(`${process.cwd()}/Invoice&PO-template.xlsx`);
      const POworksheet = book.getWorksheet('PO');

      let sumQuantity = 0;
      let colNo = 8;
      for (let i = 0; i < purchaseOrder.transactions.length; i += 1) {
        const DONumber = POworksheet.getCell(`B${colNo}`);
        DONumber.value = purchaseOrder.transactions[i].invoice;

        const carNo = POworksheet.getCell(`C${colNo}`);
        carNo.value = purchaseOrder.transactions[i].carNo;

        const poDate = POworksheet.getCell(`D${colNo}`);
        poDate.value = purchaseOrder.transactions[i].dateDelivered;

        const quantity = POworksheet.getCell(`E${colNo}`);
        quantity.value = +purchaseOrder.transactions[i].actualAmount;
        sumQuantity += +purchaseOrder.transactions[i].actualAmount;

        const price = POworksheet.getCell(`F${colNo}`);
        price.value = +purchaseOrder.transactions[i].sellingPrice;

        const amountSum = POworksheet.getCell(`G${colNo}`);
        amountSum.value = +purchaseOrder.transactions[i].sellingPrice * +purchaseOrder.transactions[i].actualAmount;
        colNo += 1;
      }

      const invoiceWorksheet = book.getWorksheet('Invoice');

      const to = invoiceWorksheet.getCell('B7');
      to.value = purchaseOrder.customerName;

      const productName = invoiceWorksheet.getCell('A13');
      productName.value = purchaseOrder.productId.name;

      const totalQuantity = invoiceWorksheet.getCell('B13');
      totalQuantity.value = sumQuantity;

      const invoicePrice = invoiceWorksheet.getCell('C13');
      invoicePrice.value = purchaseOrder.price;


      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=' + `Invoice[${purchaseOrder.PONo}] - ${purchaseOrder.productId.name}.xlsx`);

      // await book.xlsx.writeFile(`${process.cwd()}/temp.xlsx`);

      // cloudinary.uploader.upload(`${process.cwd()}/temp.xlsx`,
      //   { resource_type: 'raw', public_id: `Invoice[${purchaseOrder.PONo}] - ${purchaseOrder.productId.name}.xlsx` },
      //   (err, result) => {
      //     if (err) {
      //       console.log(err);
      //     } else {
      //       const imageUrl = result.secure_url;
      //     }
      //   });
      await book.xlsx.write(res);
      res.end();
      resolve(true);
    } catch (error) {
      reject(error);
    }
  }),
};
