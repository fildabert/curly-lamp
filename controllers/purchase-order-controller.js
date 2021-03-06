/* eslint-disable linebreak-style */
/* eslint-disable no-useless-concat */
/* eslint-disable newline-per-chained-call */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-async-promise-executor */
const ExcelJS = require('exceljs');
const PurchaseOrder = require('../models/purchase-order');
const Customer = require('../models/customer');
const Transaction = require('../models/transaction');
const InvoiceController = require('./invoice-controller');
const FeeController = require('./fee-controller');
const Product = require('../models/product');
const redisCache = require('../redis');

module.exports = {
  createOrder: ({
    productId,
    price,
    customerId,
    totalAmount,
    ordersCompleted = 0,
    approvedBy,
    PONo,
    dateIssued,
    // dueDate,
  }) => new Promise(async (resolve, reject) => {
    try {
      const product = await Product.findOne({ _id: productId });
      if (!product) {
        throw Object.assign(new Error('Product Not Found'), { code: 400 });
      }

      const customer = await Customer.findOne({ _id: customerId });
      if (!customer) {
        throw Object.assign(new Error('Customer Not Found'), { code: 400 });
      }

      const newOrder = new PurchaseOrder({
        productId,
        price,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerId,
        transactions: [],
        totalAmount,
        ordersCompleted,
        dateIssued,
        approvedBy,
        PONo,
        type: 'BUYER',
        // dueDate,
      });

      // if (product.stock - totalAmount < 0) {
      //   throw Object.assign(new Error(`Product stock not enough, stock for ${product.name}: ${product.stock}`), { code: 400 });
      // }

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
    customerId,
    totalAmount,
    ordersCompleted = 0,
    approvedBy,
    PONo,
    dateIssued,
  }) => new Promise(async (resolve, reject) => {
    try {
      const product = await Product.findOne({ _id: productId });
      if (!product) {
        throw Object.assign(new Error('Product Not Found'), { code: 400 });
      }

      const customer = await Customer.findOne({ _id: customerId });
      if (!customer) {
        throw Object.assign(new Error('Customer Not Found'), { code: 400 });
      }

      const purchaseOrderSupplier = await PurchaseOrder.findOne({ productId, status: 'ACTIVE', type: 'SUPPLIER' });

      if (purchaseOrderSupplier && product.name !== 'Multiple') {
        throw Object.assign(new Error(`There is already an ongoing PO(SUPPLIER) for product ${product.name}`), { code: 400 });
      }

      const newOrder = new PurchaseOrder({
        productId,
        price: product.price,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerId,
        transactions: [],
        totalAmount,
        ordersCompleted,
        approvedBy,
        PONo,
        type: 'SUPPLIER',
        dateIssued,
      });

      product.stock += Number(totalAmount);
      await product.save();
      await newOrder.save();
      redisCache.del('purchaseOrderSupplier');
      redisCache.del('products');

      resolve(newOrder);
    } catch (error) {
      reject(error);
    }
  }),

  findOneOrder: (orderId) => new Promise(async (resolve, reject) => {
    try {
      const order = await PurchaseOrder.findOne({ _id: orderId }).populate({
        path: 'transactions', options: { sort: { dateDelivered: 'desc' } }, select: 'invoice _id dateDelivered status actualAmount amount', populate: { path: 'productId', select: 'name -_id unit' },
      }).populate('productId', 'name _id price').populate('additionalFee').lean();
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
          // .populate({ path: 'transactions', select: 'invoice _id dateDelivered status actualAmount', populate: { path: 'productId', select: 'name -_id' } })
          const orders = await PurchaseOrder.find({ $or: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }], type: 'BUYER' }).sort({ dateIssued: 'desc' }).populate('additionalFee').populate('productId', 'name _id').lean();
          redisCache.setex('purchaseOrder', (60 * 60), JSON.stringify(orders));
          resolve(orders);
        }
      });
    } catch (error) {
      reject(error);
    }
  }),

  findAllOrdersSupplier: () => new Promise((resolve, reject) => {
    try {
      redisCache.get('purchaseOrderSupplier', async (err, cache) => {
        if (cache) {
          resolve(JSON.parse(cache));
        } else {
          const orders = await PurchaseOrder.find({ $or: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }], type: 'SUPPLIER' }).sort({ dateIssued: 'desc' }).populate('productId').lean();
          redisCache.setex('purchaseOrderSupplier', (60 * 60), JSON.stringify(orders));
          resolve(orders);
        }
      });
    } catch (error) {
      reject(error);
    }
  }),

  findOrderStream: (res) => new Promise(async (resolve, reject) => {
    try {
      // eslint-disable-next-line no-restricted-syntax
      const count = await PurchaseOrder.count({ $or: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }], type: 'BUYER' });
      const cursor = PurchaseOrder.find({ $or: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }], type: 'BUYER' })
        .populate({ path: 'transactions', select: 'invoice _id dateDelivered status actualAmount', populate: { path: 'productId', select: 'name -_id' } })
        .populate('additionalFee')
        .populate('productId', 'name _id')
        .sort({ createdAt: 'desc' }).cursor();

      const result = [];
      let current = 0;
      cursor.on('data', (doc) => {
        current += 1;
        console.log(doc.PONo);
        res.write(JSON.stringify(doc));

        if (count - current > 5) {
          cursor.next((error, nextDoc) => {
            current += 1;
            if (error) {
              console.log(error);
            } else {
              console.log(nextDoc.PONo);
              res.write(JSON.stringify(nextDoc));
            }
          });
        }

        if (count - current > 5) {
          cursor.next((error, nextDoc) => {
            current += 1;
            if (error) {
              console.log(error);
            } else {
              console.log(nextDoc.PONo);
              res.write(JSON.stringify(nextDoc));
            }
          });
        }
      });

      cursor.on('end', () => res.end());
    } catch (error) {
      // reject(error);
    }
  }),

  findAllOrdersSupplierActive: () => new Promise(async (resolve, reject) => {
    try {
      const orders = await PurchaseOrder.find({ type: 'SUPPLIER', status: 'ACTIVE' }).sort({ createdAt: 'desc' }).populate('transactions').populate('productId');
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
      dateIssued,
      ordersCompleted,
      PONo,
      price,
      fees,
      // dueDate,
    } = payload;

    try {
      const newOrder = await PurchaseOrder.findOne({ _id: orderId }).populate('transactions');
      if (!newOrder) {
        throw Object.assign(new Error('Order Not Found'), { code: 400 });
      }

      const promises = [];

      if (fees) {
        fees.forEach((fee) => {
          const createFee = FeeController.createFee({
            productId: fee.productId, amount: fee.amount, customerId: fee.agentId, customerName: fee.agent, productName: fee.product,
          });
          promises.push(createFee);
        });
      }
      const additionalFee = await Promise.all(promises);

      newOrder.productId = productId || newOrder.productId;
      newOrder.price = price || newOrder.price;
      newOrder.customerName = customerName || newOrder.customerName;
      newOrder.customerPhone = customerPhone || newOrder.customerPhone;
      newOrder.customerAddress = customerAddress || newOrder.customerAddress;
      newOrder.customerId = customerId || newOrder.customerId;
      newOrder.totalAmount = totalAmount || newOrder.totalAmount;
      // newOrder.ordersCompleted = ordersCompleted || newOrder.ordersCompleted;
      newOrder.PONo = PONo || newOrder.PONo;
      newOrder.additionalFee = additionalFee;
      newOrder.dateIssued = dateIssued || newOrder.dateIssued;

      if (newOrder.totalAmount - newOrder.ordersCompleted > 0) {
        newOrder.status = 'ACTIVE';
      }

      const updatedOrder = await newOrder.save();
      redisCache.del('purchaseOrder');
      redisCache.del('purchaseOrderSupplier');
      resolve(updatedOrder);
    } catch (error) {
      reject(error);
    }
  }),

  editOrderSupplier: ({ _id, amount }) => new Promise(async (resolve, reject) => {
    try {
      const purchaseOrder = await PurchaseOrder.findOne({ _id });
      const product = await Product.findOne({ _id: purchaseOrder.productId });
      if (!purchaseOrder) {
        throw Object.assign(new Error('PO Not found'), { code: 400 });
      }

      if (!product) {
        throw Object.assign(new Error('Product not found'), { code: 400 });
      }

      purchaseOrder.totalAmount += Number(amount);
      product.stock += Number(amount);

      await purchaseOrder.save();
      await product.save();
      redisCache.del('purchaseOrder');
      redisCache.del('purchaseOrderSupplier');
      redisCache.del('products');
      resolve({ success: true });
    } catch (error) {
      reject(error);
    }
  }),

  patchOrder: (orderId) => new Promise(async (resolve, reject) => {
    try {
      const order = await PurchaseOrder.findOne({ _id: orderId });
      if (!order) {
        throw Object.assign(new Error('Order not found'), { code: 400 });
      }
      const product = await Product.findOne({ _id: order.productId });
      if (!product) {
        throw Object.assign(new Error('Product not found'), { code: 400 });
      }

      if (order.status === 'COMPLETED') {
        order.status = 'ACTIVE';
      } else {
        order.status = 'COMPLETED';
      }
      product.stock = 0;
      const updatedOrder = await order.save();
      await product.save();
      redisCache.del('purchaseOrder');
      redisCache.del('purchaseOrderSupplier');
      redisCache.del('products');
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
      redisCache.del('purchaseOrderSupplier');
      resolve({ success: true, data: order });
    } catch (error) {
      reject(error);
    }
  }),

  printMany: ({
    orderIds, startDate, endDate, dueDate, invoiceName,
  }) => new Promise(async (resolve, reject) => {
    try {
      endDate.setHours(23, 59, 59, 999);
      const promises = [];

      orderIds.forEach((orderId) => {
        promises.push(PurchaseOrder.findOne({ _id: orderId }).populate('transactions', null, { dateDelivered: { $gte: startDate, $lte: endDate }, status: 'COMPLETED' }, { populate: 'productId' }).populate('productId').populate('additionalFee'));
      });

      const result = await Promise.all(promises);

      let checkNull = 0;
      const checkCustomer = {};

      for (let i = 0; i < result.length; i += 1) {
        if (!checkCustomer[result[i].customerId]) {
          checkCustomer[result[i].customerId] = 1;
        } else {
          checkCustomer[result[i].customerId] += 1;
        }

        if (result[i].transactions.length === 0) {
          checkNull += 1;
          delete result[i];
        }
      }

      if (checkNull === result.length) {
        throw Object.assign(new Error(`No invoice found between ${startDate} to ${endDate}`), { code: 400 });
      }
      if (Object.keys(checkCustomer).length > 1) {
        throw Object.assign(new Error('Please only select POs that belong to the same Vendor'), { code: 400 });
      }

      let invoiceTotalAmount = 0;
      let invoiceTotalQuantity = 0;

      const transactionz = [];
      result.forEach((PO) => {
        transactionz.push(...PO.transactions);
        PO.transactions.forEach((trx) => {
          invoiceTotalQuantity += trx.actualAmount;
          invoiceTotalAmount += Number(trx.sellingPrice) * Number(trx.actualAmount);
        });
      });

      await InvoiceController.createInvoice({
        customerId: result[0].customerId,
        name: invoiceName,
        purchaseOrderId: result,
        transactionId: transactionz,
        invoiceDate: new Date(),
        dueDate,
        startDate,
        endDate,
        totalAmount: invoiceTotalAmount,
        quantity: invoiceTotalQuantity,
        type: result[0].type,
      });

      return resolve({ success: true });
    } catch (error) {
      return reject(error);
    }
  }),

  print: (payload, res) => new Promise(async (resolve, reject) => {
    try {
      const {
        orderId, startDate, endDate, dueDate, invoiceName,
      } = payload;

      // startDate.setHours(0, 0, 0, 0);

      endDate.setHours(23, 59, 59, 999);

      const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId })
        .populate('transactions', null, { dateDelivered: { $gte: startDate, $lte: endDate }, status: 'COMPLETED' }, { populate: 'productId' }, { sort: { dateDelivered: 'asc' } })
        .populate('productId')
        .populate('additionalFee')
        .populate('customerId');
      if (!purchaseOrder) {
        throw Object.assign(new Error('Puchase Order not found'), { code: 400 });
      }

      if (purchaseOrder.transactions.length === 0) {
        throw Object.assign(new Error(`No invoice found between ${startDate} to ${endDate}`), { code: 400 });
      }
      const workbook = new ExcelJS.Workbook();
      const book = await workbook.xlsx.readFile(`${process.cwd()}/Invoice&PO-template.xlsx`);
      const DOworksheet = book.getWorksheet('DO');

      const customerName = DOworksheet.getCell('A4');
      customerName.value = purchaseOrder.customerName;
      const title = DOworksheet.getCell('A5');
      title.value = `PO Number: ${purchaseOrder.PONo} (${startDate.toString().replace(' GMT+0700 (Western Indonesia Time)', '')} - ${endDate.toString().replace(' GMT+0700 (Western Indonesia Time)', '')})`;

      let sumQuantity = 0;
      let colNo = 7;
      const colAdd = 18;
      let invoiceTotalAmount = 0;
      let invoiceTotalQuantity = 0;
      for (let i = 0; i < purchaseOrder.transactions.length; i += 1) {
        invoiceTotalQuantity += purchaseOrder.transactions[i].actualAmount;
        if (purchaseOrder.type === 'BUYER') {
          invoiceTotalAmount += Number(purchaseOrder.transactions[i].sellingPrice) * Number(purchaseOrder.transactions[i].actualAmount);
        } else if (purchaseOrder.type === 'SUPPLIER') {
          invoiceTotalAmount += Number(purchaseOrder.transactions[i].buyingPrice) * Number(purchaseOrder.transactions[i].actualAmount);
        }

        const DONumber = DOworksheet.getCell(`B${colNo}`);
        DONumber.value = purchaseOrder.transactions[i].invoice;

        const carNo = DOworksheet.getCell(`C${colNo}`);
        carNo.value = purchaseOrder.transactions[i].carNo || 'XXX';

        const DODatedelivered = DOworksheet.getCell(`D${colNo}`);
        DODatedelivered.value = purchaseOrder.transactions[i].dateDelivered;

        const quantity = DOworksheet.getCell(`E${colNo}`);
        quantity.value = +purchaseOrder.transactions[i].actualAmount;
        sumQuantity += +purchaseOrder.transactions[i].actualAmount;

        const price = DOworksheet.getCell(`F${colNo}`);
        if (purchaseOrder.type === 'BUYER') {
          price.value = +purchaseOrder.transactions[i].sellingPrice;
        } else if (purchaseOrder.type === 'SUPPLIER') {
          price.value = +purchaseOrder.transactions[i].buyingPrice;
        }

        colNo += 1;
      }
      const POWorksheet = book.getWorksheet('Invoice');

      await InvoiceController.createInvoice({
        customerId: purchaseOrder.customerId._id,
        name: invoiceName,
        purchaseOrderId: [purchaseOrder],
        transactionId: purchaseOrder.transactions,
        invoiceDate: new Date(),
        dueDate,
        startDate,
        endDate,
        totalAmount: invoiceTotalAmount,
        quantity: invoiceTotalQuantity,
        type: purchaseOrder.type,
      });

      const NO = POWorksheet.getCell('B4');
      NO.value = purchaseOrder.PONo;

      const date = POWorksheet.getCell('B5');
      date.value = new Date().toString();

      const to = POWorksheet.getCell('B7');
      to.value = purchaseOrder.customerId.name;

      const customerAddress = POWorksheet.getCell('A8');
      customerAddress.value = purchaseOrder.customerId.address;

      const NPWP = POWorksheet.getCell('B11');
      NPWP.value = purchaseOrder.customerId.npwp;

      const PONo = POWorksheet.getCell('B10');
      PONo.value = purchaseOrder.PONo;

      const productName = POWorksheet.getCell('A14');
      productName.value = purchaseOrder.productId.name;

      const totalQuantity = POWorksheet.getCell('C14');
      totalQuantity.value = sumQuantity;

      const invoicePrice = POWorksheet.getCell('D14');
      invoicePrice.value = purchaseOrder.price / 1.1;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=' + `Invoice[${purchaseOrder.PONo}] - ${purchaseOrder.productId.name}.xlsx`);
      await book.xlsx.write(res);
      res.end();
      resolve(true);
    } catch (error) {
      reject(error);
    }
  }),
};
