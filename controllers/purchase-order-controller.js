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
    dueDate,
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
        dueDate,
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
          const orders = await PurchaseOrder.find({ $or: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }], type: 'BUYER' }).sort({ createdAt: 'desc' }).populate({ path: 'transactions', populate: { path: 'productId', select: 'name -_id' } }).populate('productId');
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
          const orders = await PurchaseOrder.find({ $or: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }], type: 'SUPPLIER' }).sort({ createdAt: 'desc' }).populate('transactions').populate('productId');
          redisCache.setex('purchaseOrderSupplier', (60 * 60), JSON.stringify(orders));
          resolve(orders);
        }
      });
    } catch (error) {
      reject(error);
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
      ordersCompleted,
      PONo,
      price,
      // dueDate,
    } = payload;

    try {
      const newOrder = await PurchaseOrder.findOne({ _id: orderId }).populate('transactions');
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
      // newOrder.ordersCompleted = ordersCompleted || newOrder.ordersCompleted;
      newOrder.PONo = PONo || newOrder.PONo;
      // newOrder.dueDate = dueDate || newOrder.dueDate;

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
    orderIds, startDate, endDate, dueDate,
  }) => new Promise(async (resolve, reject) => {
    try {
      endDate.setHours(23, 59, 59, 999);
      const promises = [];

      orderIds.forEach((orderId) => {
        promises.push(PurchaseOrder.findOne({ _id: orderId }).populate('transactions', null, { dateDelivered: { $gte: startDate, $lte: endDate }, status: 'COMPLETED' }, { populate: 'productId' }).populate('approvedBy'));
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
        throw Object.assign(new Error('Please only select POs that belong to the same Buyer'), { code: 400 });
      }

      const purchaseOrder = result[0];

      for (let i = 1; i < result.length; i += 1) {
        purchaseOrder.transactions.push(...result[i].transactions);
        purchaseOrder.PONo += `|${result[i].PONo}`;
      }

      let invoiceTotalAmount = 0;
      let invoiceTotalQuantity = 0;

      purchaseOrder.transactions.forEach((trx) => {
        invoiceTotalQuantity += trx.actualAmount;
        invoiceTotalAmount += Number(trx.sellingPrice) * Number(trx.actualAmount);
      });

      await InvoiceController.createInvoice({
        customerId: purchaseOrder.customerId,
        name: purchaseOrder.PONo,
        purchaseOrderId: purchaseOrder._id,
        transactionId: purchaseOrder.transactions.map((trx) => trx._id),
        invoiceDate: new Date(),
        dueDate,
        startDate,
        endDate,
        totalAmount: invoiceTotalAmount,
        quantity: invoiceTotalQuantity,
        type: purchaseOrder.type,
      });

      return resolve({ success: true });
    } catch (error) {
      return reject(error);
    }
  }),

  print: (payload, res) => new Promise(async (resolve, reject) => {
    try {
      const {
        orderId, startDate, endDate, dueDate,
      } = payload;
      // console.log(startDate);
      // startDate.setHours(0, 0, 0, 0);

      endDate.setHours(23, 59, 59, 999);
      const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId }).populate('transactions', null, { dateDelivered: { $gte: startDate, $lte: endDate }, status: 'COMPLETED' }, { populate: 'productId' }).populate('approvedBy');
      if (!purchaseOrder) {
        throw Object.assign(new Error('Puchase Order not found'), { code: 400 });
      }

      if (purchaseOrder.transactions.length === 0) {
        throw Object.assign(new Error(`No invoice found between ${startDate} to ${endDate}`), { code: 400 });
      }
      const workbook = new ExcelJS.Workbook();
      const book = await workbook.xlsx.readFile(`${process.cwd()}/Invoice&PO-template.xlsx`);
      const POworksheet = book.getWorksheet('PO');

      const title = POworksheet.getCell('A5');
      title.value = `${purchaseOrder.customerName}
      PO Number: ${purchaseOrder.PONo} (${startDate.toString()} - ${endDate.toString()})`;

      let sumQuantity = 0;
      let colNo = 8;
      const colAdd = 18;
      let invoiceTotalAmount = 0;
      let invoiceTotalQuantity = 0;
      for (let i = 0; i < purchaseOrder.transactions.length; i += 1) {
        // if (i > 10) {
        //   POworksheet.spliceRows(colAdd, 0, [i,
        //     purchaseOrder.transactions[i].productId.name,
        //     purchaseOrder.transactions[i].invoice,
        //     purchaseOrder.transactions[i].dateDelivered,
        //     Number(purchaseOrder.transactions[i].actualAmount),
        //     Number(purchaseOrder.transactions[i].sellingPrice),
        //     Number(purchaseOrder.transactions[i].sellingPrice) * Number(purchaseOrder.transactions[i].actualAmount),
        //   ]);
        //   POworksheet.spliceRows(colAdd, 1, [0, 1, 2, 3, 4, 5, 6]);
        //   POworksheet.getRow(colAdd).eachCell((cell) => {
        //     cell.style = POworksheet.getCell('B8').style;
        //   });
        //   colAdd += 1;
        // }
        invoiceTotalQuantity += purchaseOrder.transactions[i].actualAmount;
        invoiceTotalAmount += Number(purchaseOrder.transactions[i].sellingPrice) * Number(purchaseOrder.transactions[i].actualAmount);

        const itemName = POworksheet.getCell(`B${colNo}`);
        itemName.value = purchaseOrder.transactions[i].productId.name;

        const description = POworksheet.getCell(`C${colNo}`);
        description.value = purchaseOrder.transactions[i].invoice;

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

      await InvoiceController.createInvoice({
        customerId: purchaseOrder.customerId,
        name: purchaseOrder.PONo,
        purchaseOrderId: purchaseOrder._id,
        transactionId: purchaseOrder.transactions,
        invoiceDate: new Date(),
        dueDate,
        startDate,
        endDate,
        totalAmount: invoiceTotalAmount,
        quantity: invoiceTotalQuantity,
        type: purchaseOrder.type,
      });

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
