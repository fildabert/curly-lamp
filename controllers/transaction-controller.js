/* eslint-disable max-len */
/* eslint-disable no-var */
/* eslint-disable no-plusplus */
/* eslint-disable vars-on-top */
/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-async-promise-executor */
const fs = require('fs');
const axios = require('axios');
const PurchaseOrder = require('../models/purchase-order');
const Customer = require('../models/customer');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const Product = require('../models/product');
const redisCache = require('../redis');
const redisHelper = require('../helpers/redis.js');

// eslint-disable-next-line no-new


module.exports = {
  createTransaction: ({
    orderId,
    orderIdMultiple,
    orderIdSupplier,
    productId,
    amount,
    sellingPrice,
    invoice,
    customerName,
    customerPhone,
    customerAddress,
    customerId,
    dateDelivered,
    approvedBy,
    dueDate,
  }) => new Promise(async (resolve, reject) => {
    try {
      if (!dateDelivered) {
        throw Object.assign(new Error('Date Delivered is required'), { code: 400 });
      }
      const checkProduct = await Product.findOne({ _id: productId });
      if (!checkProduct || checkProduct.name === 'Multiple') {
        throw Object.assign(new Error('Product Not Found'), { code: 400 });
      }

      // if (checkProduct.stock - amount <= 0) {
      //   throw Object.assign(new Error('Product is out of stock'), { code: 400 });
      // }

      const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId });
      if (!purchaseOrder) {
        throw Object.assign(new Error('Purchase Order not found'), { code: 400 });
      }

      const customer = await Customer.findOne({ _id: customerId });
      if (!customer) {
        throw Object.assign(new Error('Customer not found'), { code: 400 });
      }

      let purchaseOrderSupplier;
      if (orderIdSupplier) {
        purchaseOrderSupplier = await PurchaseOrder.findOne({ _id: orderIdSupplier });
      } else {
        purchaseOrderSupplier = await PurchaseOrder.findOne({ productId, status: 'ACTIVE', type: 'SUPPLIER' });
      }

      if (!purchaseOrderSupplier) {
        throw Object.assign(new Error(`There is no ongoing Purchase Order (SUPPLIER) for product ${checkProduct.name}`), { code: 400 });
      }

      if (purchaseOrder.ordersCompleted + amount > purchaseOrder.totalAmount) {
        throw Object.assign(new Error('Purchase Order may be completed or the amount you entered is too much'), { code: 400, data: purchaseOrder });
      }

      if (purchaseOrderSupplier.ordersCompleted + amount > purchaseOrderSupplier.totalAmount) {
        throw Object.assign(new Error(`Total quota exceeded, please update Purchase Order (SUPPLIER) for product ${checkProduct.name}`), { code: 400, data: purchaseOrder });
      }

      checkProduct.stock -= amount;
      await checkProduct.save();

      const newTransanction = new Transaction({
        productId,
        orderId,
        orderIdSupplier: purchaseOrderSupplier._id,
        amount,
        buyingPrice: checkProduct.price,
        sellingPrice,
        invoice,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerId,
        dateDelivered,
        approvedBy,
        type: 'BUYER',
        status: 'PENDING',
        dueDate,
      });

      const transactionCreated = await newTransanction.save();

      purchaseOrder.transactions.push(transactionCreated);
      purchaseOrderSupplier.transactions.push(transactionCreated);
      purchaseOrder.ordersCompleted += Number(amount);
      purchaseOrderSupplier.ordersCompleted += Number(amount);

      if (purchaseOrder.ordersCompleted === purchaseOrder.totalAmount) {
        purchaseOrder.status = 'COMPLETED';
      }

      // if (orderIdMultiple) {
      //   const POMultiple = await PurchaseOrder.findOne({ _id: orderIdMultiple._id });
      //   POMultiple.transactions.push(transactionCreated);
      //   await POMultiple.save();
      // }

      const updatedPO = await purchaseOrder.save();
      const updatedPOSupplier = await purchaseOrderSupplier.save();
      await updatedPO.populate('transactions').execPopulate();
      await updatedPOSupplier.populate('productId', 'name').execPopulate();
      await updatedPOSupplier.populate('transactions').execPopulate();
      updatedPO.productId = checkProduct;
      // if (!redisHelper.update('purchaseOrder', updatedPO, 'createdAt')) redisCache.del('purchaseOrder');
      // if (!redisHelper.update('purchaseOrderSupplier', updatedPOSupplier, 'createdAt')) redisCache.del('purchaseOrderSupplier');
      // if (!redisHelper.update('transactions', transactionCreated, 'dateDelivered')) redisCache.del('transactions');
      redisCache.del('purchaseOrder');
      redisCache.del('purchaseOrderSupplier');
      redisCache.del('transactions');
      redisCache.del('products');

      const elasticSearchPayload = {
        ...transactionCreated._doc,
        purchaseOrder: purchaseOrder.PONo,
        productName: checkProduct.name,
        productCategory: checkProduct.category,
        productPrice: checkProduct.price,
        revenue: 0,
        profit: 0,
      };

      delete elasticSearchPayload._id;

      axios({
        method: 'PUT',
        url: `https://ni4m1c9j8p:oojdvhi83y@curly-lamp-9585578215.ap-southeast-2.bonsaisearch.net/transactions/_doc/${transactionCreated._id}`,
        data: elasticSearchPayload,
      });

      resolve(newTransanction);
    } catch (error) {
      reject(error);
    }
  }),

  updateTransaction: ({
    transactionId,
    orderId,
    productId,
    carNo,
    invoice,
    amount,
    actualAmount,
    buyingPrice,
    sellingPrice,
    dateDelivered,
    dueDate,
  }) => new Promise(async (resolve, reject) => {
    try {
      const transaction = await Transaction.findOne({ _id: transactionId });
      if (!transaction) {
        throw Object.assign(new Error('Transaction not found'), { code: 400 });
      }

      const checkProduct = await Product.findOne({ _id: productId });
      if (!checkProduct) {
        throw Object.assign(new Error('Product Not Found'), { code: 400 });
      }

      const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId });
      if (!purchaseOrder) {
        throw Object.assign(new Error('Purchase Order not found'), { code: 400 });
      }

      let purchaseOrderSupplier;
      if (!transaction.orderIdSupplier) {
        purchaseOrderSupplier = await PurchaseOrder.findOne({ productId, status: 'ACTIVE', type: 'SUPPLIER' });
        if (!purchaseOrderSupplier) {
          throw Object.assign(new Error('Purchase Order (SUPPLIER) not found'), { code: 400 });
        }
        transaction.orderIdSupplier = purchaseOrderSupplier._id;
      } else {
        purchaseOrderSupplier = await PurchaseOrder.findOne({ _id: transaction.orderIdSupplier });
        if (!purchaseOrderSupplier) {
          throw Object.assign(new Error('Purchase Order (SUPPLIER) not found'), { code: 400 });
        }
      }

      // if (purchaseOrder.ordersCompleted > purchaseOrder.totalAmount) {
      //   throw Object.assign(new Error('Purchase Order may be completed or the amount you entered is too much'), { code: 400, data: purchaseOrder });
      // }

      if (actualAmount) {
        if (!transaction.actualAmount) {
          checkProduct.stock -= (Number(actualAmount) - Number(amount));
          transaction.revenue = Number(sellingPrice) * Number(actualAmount);
          transaction.profit = (Number(sellingPrice) - Number(buyingPrice)) * Number(actualAmount);
          purchaseOrder.ordersCompleted += (Number(actualAmount) - Number(amount));
          purchaseOrderSupplier.ordersCompleted += (Number(actualAmount) - Number(amount));
        } else {
          checkProduct.stock -= (Number(actualAmount) - Number(transaction.actualAmount));
          transaction.revenue = Number(sellingPrice) * Number(actualAmount);
          transaction.profit = (Number(sellingPrice) - Number(buyingPrice)) * Number(actualAmount);
          purchaseOrder.ordersCompleted += (Number(actualAmount) - Number(transaction.actualAmount));
          purchaseOrderSupplier.ordersCompleted += (Number(actualAmount) - Number(transaction.actualAmount));
        }
      }
      transaction.sellingPrice = sellingPrice || transaction.sellingPrice;
      transaction.carNo = carNo || transaction.carNo;
      transaction.actualAmount = actualAmount || transaction.actualAmount;
      transaction.dateDelivered = dateDelivered || transaction.dateDelivered;
      transaction.createdAt = dateDelivered || transaction.createdAt;
      // transaction.dueDate = dueDate || transaction.dueDate || null;
      transaction.invoice = invoice || transaction.invoice;
      if (!transaction.dateReceived) {
        transaction.dateReceived = new Date();
      }

      if (transaction.invoice && transaction.actualAmount) {
        transaction.status = 'COMPLETED';
      }

      const elasticSearchPayload = {
        ...transaction._doc,
        purchaseOrder: purchaseOrder.PONo,
        productName: checkProduct.name,
        productCategory: checkProduct.category,
        productPrice: checkProduct.price,
      };

      delete elasticSearchPayload._id;

      axios({
        method: 'PUT',
        url: `https://ni4m1c9j8p:oojdvhi83y@curly-lamp-9585578215.ap-southeast-2.bonsaisearch.net/transactions/_doc/${transaction._id}`,
        data: elasticSearchPayload,
      });

      const updatedTransaction = await transaction.save();
      await checkProduct.save();
      await purchaseOrder.save();
      await purchaseOrderSupplier.save();
      redisCache.del('purchaseOrder');
      redisCache.del('purchaseOrderSupplier');
      redisCache.del('products');
      redisCache.del('transactions');

      resolve(updatedTransaction);
    } catch (error) {
      reject(error);
    }
  }),

  bulkCreate: ({
    orderId,
    orderIdSupplier,
    productId,
    amount,
    sellingPrice,
    invoice,
    customerId,
    dateDelivered,
    approvedBy,
    dueDate,
    repeat,
  }) => new Promise(async (resolve, reject) => {
    try {
      if (!dateDelivered) {
        throw Object.assign(new Error('Date Delivered is required'), { code: 400 });
      }
      const checkProduct = await Product.findOne({ _id: productId });
      const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId });
      const customer = await Customer.findOne({ _id: customerId });

      if (!customer) {
        throw Object.assign(new Error('customer not found'), { code: 400 });
      }

      let purchaseOrderSupplier;
      if (orderIdSupplier) {
        purchaseOrderSupplier = await PurchaseOrder.findOne({ _id: orderIdSupplier });
      } else {
        purchaseOrderSupplier = await PurchaseOrder.findOne({ productId, status: 'ACTIVE', type: 'SUPPLIER' });
      }

      checkProduct.stock -= amount;
      await checkProduct.save();

      const transactionz = [];

      const newTransanction = {
        productId,
        orderId,
        orderIdSupplier: purchaseOrderSupplier._id,
        amount,
        buyingPrice: checkProduct.price,
        sellingPrice,
        invoice,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerId,
        dateDelivered,
        approvedBy,
        type: 'BUYER',
        status: 'PENDING',
        dueDate,
      };
      for (var a = 0; a < repeat; a++) {
        transactionz.push(newTransanction);
      }
      const transactionCreated = await Transaction.insertMany(transactionz);

      for (var b = 0; b < transactionCreated.length; b++) {
        purchaseOrder.transactions.push(transactionCreated[b]);
        purchaseOrderSupplier.transactions.push(transactionCreated[b]);
      }

      await purchaseOrder.save();
      await purchaseOrderSupplier.save();

      redisCache.del('purchaseOrder');
      redisCache.del('purchaseOrderSupplier');
      redisCache.del('products');
      redisCache.del('transactions');

      const elasticSearchPayload = {
        ...transactionCreated[0]._doc,
        purchaseOrder: purchaseOrder.PONo,
        productName: checkProduct.name,
        productCategory: checkProduct.category,
        productPrice: checkProduct.price,
        revenue: 0,
        profit: 0,
      };

      delete elasticSearchPayload._id;

      // let str = '';
      // for (var c = 0; c < repeat; c++) {
      //   str += `{ "index" : { "_index" : "transactions", "_id" : "${transactionCreated[c]._id}" } }
      //   ${JSON.stringify(elasticSearchPayload)}
      //   `;
      // }
      // fs.writeFileSync('./json/bulk.json', str, 'utf8');
      // const jsonn = fs.readFileSync('./json/bulk.json', 'utf8');
      // console.log(jsonn);
      // await axios({
      //   method: 'PUT',
      //   url: 'https://ni4m1c9j8p:oojdvhi83y@curly-lamp-9585578215.ap-southeast-2.bonsaisearch.net/transactions/_bulk?pretty',
      //   data: jsonn,
      // });
      resolve(newTransanction);
    } catch (error) {
      console.log(error);
      reject(error);
    }
  }),
  createTransactionSupplier: ({
    orderId,
    productId,
    amount,
    invoice,
    customerName,
    customerPhone,
    customerAddress,
    approvedBy,
    dateDelivered,
    dueDate,
  }) => new Promise(async (resolve, reject) => {
    try {
      const checkProduct = await Product.findOne({ _id: productId });
      if (!checkProduct) {
        throw Object.assign(new Error('Product Not Found'), { code: 400 });
      }

      const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId });
      if (!purchaseOrder) {
        throw Object.assign(new Error('Purchase Order not found'), { code: 400 });
      }

      const newTransanction = new Transaction({
        productId,
        orderId,
        amount,
        buyingPrice: checkProduct.price,
        invoice,
        actualAmount: amount,
        // revenue,
        // profit,
        customerName,
        customerPhone,
        customerAddress,
        approvedBy,
        type: 'SUPPLIER',
        status: 'COMPLETED',
        dateDelivered,
        dateReceived: new Date(),
        dueDate,
      });

      const transactionCreated = await newTransanction.save();

      purchaseOrder.transactions.push(transactionCreated);
      purchaseOrder.ordersCompleted += +amount;
      if (purchaseOrder.ordersCompleted === purchaseOrder.totalAmount) {
        purchaseOrder.status = 'COMPLETED';
      }
      await purchaseOrder.save();

      redisCache.del('purchaseOrder');
      redisCache.del('products');

      const elasticSearchPayload = {
        ...transactionCreated._doc,
        orderId,
        productName: checkProduct.name,
        productCategory: checkProduct.category,
        productPrice: checkProduct.price,
      };

      delete elasticSearchPayload._id;

      // axios({
      //   method: 'PUT',
      //   url: `https://ni4m1c9j8p:oojdvhi83y@curly-lamp-9585578215.ap-southeast-2.bonsaisearch.net/transactions/_doc/${transactionCreated._id}`,
      //   data: elasticSearchPayload,
      // });

      resolve(newTransanction);
    } catch (error) {
      reject(error);
    }
  }),

  findAllTransactions: () => new Promise((resolve, reject) => {
    try {
      redisCache.get('transactions', async (err, cache) => {
        if (cache) {
          resolve(JSON.parse(cache));
        } else {
          const transaction = await Transaction.find({ active: true }).sort({ dateDelivered: 'desc' }).populate('orderId').populate('productId');
          if (!transaction) {
            throw Object.assign(new Error('Transaction not found'), { code: 400 });
          }
          redisCache.setex('transactions', (60 * 60), JSON.stringify(transaction));
          resolve(transaction);
        }
      });
    } catch (error) {
      reject(error);
    }
  }),

  findOneTransaction: (trxId) => new Promise(async (resolve, reject) => {
    try {
      const transaction = await Transaction.findOne({ _id: trxId }).populate('orderId').populate('productId');
      if (!transaction) {
        throw Object.assign(new Error('Transaction not found'), { code: 400 });
      }
      resolve(transaction);
    } catch (error) {
      reject(error);
    }
  }),

  deleteTransaction: ({ trxId, orderId }) => new Promise(async (resolve, reject) => {
    try {
      console.log('DELETE TRANS');
      const transaction = await Transaction.findOne({ _id: trxId });
      const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId, type: 'BUYER' });
      const purchaseOrderSupplier = await PurchaseOrder.findOne({ _id: transaction.orderIdSupplier });
      
      if(transaction && !purchaseOrder || transaction && !purchaseOrderSupplier) {
        await transaction.remove();
        axios({
          method: 'DELETE',
          url: `https://ni4m1c9j8p:oojdvhi83y@curly-lamp-9585578215.ap-southeast-2.bonsaisearch.net/transactions/_doc/${transaction._id}`,
        });
        redisCache.del('purchaseOrder');
        redisCache.del('purchaseOrderSupplier');
        redisCache.del('products');
        redisCache.del('transactions');
        return resolve({ success: true });
      }
      if (!transaction || !purchaseOrder) {
        throw Object.assign(new Error('Not found'), { code: 400 });
      }

      if (!purchaseOrderSupplier) {
        throw Object.assign(new Error('Purchase Order (Supplier) not found'), { code: 400 });
      }
      axios({
        method: 'DELETE',
        url: `https://ni4m1c9j8p:oojdvhi83y@curly-lamp-9585578215.ap-southeast-2.bonsaisearch.net/transactions/_doc/${transaction._id}`,
      });

      transaction.active = false;
      const trxIndex = purchaseOrder.transactions.indexOf(trxId);
      if (trxIndex !== -1) {
        purchaseOrder.transactions.splice(trxIndex, 1);
      }
      const trxIndex2 = purchaseOrderSupplier.transactions.indexOf(trxId);
      if (trxIndex2 !== -1) {
        purchaseOrderSupplier.transactions.splice(trxIndex2, 1);
      }
      await transaction.remove();
      await purchaseOrder.save();
      await purchaseOrderSupplier.save();
      redisCache.del('purchaseOrder');
      redisCache.del('purchaseOrderSupplier');
      redisCache.del('products');
      redisCache.del('transactions');
      resolve({ success: true });
    } catch (error) {
      reject(error);
    }
  }),

  elasticSearch: () => new Promise(async (resolve, reject) => {
    try {
      const transactions = await Transaction.find({ active: true }).sort({ dateDelivered: 'desc' }).populate('orderId', 'PONo').populate('productId');

      const result = [];
      let str = '';

      transactions.forEach(async (transaction) => {
        const elasticSearchPayload = {
          ...transaction._doc,
          purchaseOrder: transaction.orderId.PONo,
          productName: transaction.productId.name,
          productCategory: transaction.productId.category,
          productPrice: transaction.productId.price,
          revenue: transaction.revenue || 0,
          profit: transaction.profit || 0,
          createdAt: transaction.dateDelivered || transaction.createdAt,
        };
        elasticSearchPayload.productId = elasticSearchPayload.productId._id;
        elasticSearchPayload.orderId = elasticSearchPayload.orderId._id;
        delete elasticSearchPayload._id;
        // await axios({
        //   method: 'PUT',
        //   url: `https://ni4m1c9j8p:oojdvhi83y@curly-lamp-9585578215.ap-southeast-2.bonsaisearch.net/transactions/_doc/${transaction._id}`,
        //   data: elasticSearchPayload,
        // });
        str += `{ "index" : { "_index" : "transactions", "_id" : "${transaction._id}" } }
        ${JSON.stringify(elasticSearchPayload)}
        `;
        result.push(elasticSearchPayload);
      });
      fs.writeFileSync('./temp/result.json', str);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }),
};
