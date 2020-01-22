/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-async-promise-executor */
const axios = require('axios');
const PurchaseOrder = require('../models/purchase-order');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const Product = require('../models/product');
const redisCache = require('../redis');

// eslint-disable-next-line no-new


module.exports = {
  createTransaction: ({
    orderId,
    productId,
    amount,
    sellingPrice,
    revenue,
    profit,
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
      const checkProduct = await Product.findOne({ _id: productId });
      if (!checkProduct) {
        throw Object.assign(new Error('Product Not Found'), { code: 400 });
      }

      if (checkProduct.stock - amount <= 0) {
        throw Object.assign(new Error('Product is out of stock'), { code: 400 });
      }

      const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId });
      if (!purchaseOrder) {
        throw Object.assign(new Error('Purchase Order not found'), { code: 400 });
      }

      if (purchaseOrder.ordersCompleted + amount > purchaseOrder.totalAmount) {
        throw Object.assign(new Error('Purchase Order may be completed or the amount you entered is too much'), { code: 400, data: purchaseOrder });
      }

      checkProduct.stock -= amount;
      await checkProduct.save();

      // if (!revenue) {
      //   revenue = sellingPrice * amount;
      // }

      // if (!profit) {
      //   profit = revenue - (amount * checkProduct.price);
      // }

      const newTransanction = new Transaction({
        productId,
        orderId,
        amount,
        buyingPrice: checkProduct.price,
        sellingPrice,
        invoice,
        // revenue,
        // profit,
        customerName,
        customerPhone,
        customerAddress,
        customerId,
        dateDelivered,
        approvedBy,
        type: 'BUYER',
        status: 'PENDING',
        dueDate,
      });

      const transactionCreated = await newTransanction.save();

      purchaseOrder.transactions.push(transactionCreated);
      purchaseOrder.ordersCompleted += Number(amount);
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
        // revenue,
        // profit,
        purchaseOrderDueDate: purchaseOrder.dueDate,
      };

      delete elasticSearchPayload._id;

      // axios({
      //   method: 'PUT',
      //   url: `https://search-curly-lamp-qwjbn5oanez2yfrq5al4oorw5y.ap-southeast-1.es.amazonaws.com/transactions/_doc/${transactionCreated._id}`,
      //   data: elasticSearchPayload,
      // });

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

  updateTransaction: ({
    transactionId,
    orderId,
    productId,
    carNo,
    amount,
    actualAmount,
    buyingPrice,
    sellingPrice,
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

      if (purchaseOrder.ordersCompleted > purchaseOrder.totalAmount) {
        throw Object.assign(new Error('Purchase Order may be completed or the amount you entered is too much'), { code: 400, data: purchaseOrder });
      }


      const transaction = await Transaction.findOne({ _id: transactionId });

      if (!transaction) {
        throw Object.assign(new Error('Transaction not found'), { code: 400 });
      }

      if (!transaction.actualAmount) {
        checkProduct.stock -= (Number(actualAmount) - Number(amount));
        transaction.revenue = Number(sellingPrice) * Number(actualAmount);
        transaction.profit = (Number(sellingPrice) * Number(actualAmount)) - Number(buyingPrice);
        purchaseOrder.ordersCompleted += (Number(actualAmount) - Number(amount));
      }
      transaction.sellingPrice = sellingPrice;
      transaction.carNo = carNo;
      transaction.actualAmount = actualAmount;
      if (!transaction.dateReceived) {
        transaction.dateReceived = new Date();
      }
      transaction.status = 'COMPLETED';

      await checkProduct.save();
      await purchaseOrder.save();
      const updatedTransaction = await transaction.save();
      redisCache.del('purchaseOrder');
      redisCache.del('products');
      resolve(updatedTransaction);
    } catch (error) {
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
        // revenue,
        // profit,
        purchaseOrderDueDate: purchaseOrder.dueDate,
      };

      delete elasticSearchPayload._id;

      // axios({
      //   method: 'PUT',
      //   url: `https://search-curly-lamp-qwjbn5oanez2yfrq5al4oorw5y.ap-southeast-1.es.amazonaws.com/transactions/_doc/${transactionCreated._id}`,
      //   data: elasticSearchPayload,
      // });

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

  findAllTransactions: () => new Promise(async (resolve, reject) => {
    try {
      const transaction = await Transaction.find({ active: true }).sort({ created_at: 'desc' }).populate('orderId').populate('productId');
      if (!transaction) {
        throw Object.assign(new Error('Transaction not found'), { code: 400 });
      }
      resolve(transaction);
    } catch (error) {
      reject(error);
    }
  }),
};
