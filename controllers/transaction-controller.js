/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-async-promise-executor */
const { CronJob } = require('cron');
const axios = require('axios');
const PurchaseOrder = require('../models/purchase-order');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const Product = require('../models/product');
const Customer = require('../models/customer');

// eslint-disable-next-line no-new
new CronJob('0 0 */2 * * *', (async () => {
  console.log(new Date().toString());
  try {
    const OGKush = await Product.findOne({ _id: '5e1925ee1ec75148832d9c75' });
    OGKush.stock += 1;
    await OGKush.save();
  } catch (error) {
    console.log(error);
  }
}), null, true);

module.exports = {
  createTransaction: ({
    orderId,
    productId,
    amount,
    sellingPrice,
    revenue,
    profit,
    customerName,
    customerPhone,
    customerAddress,
    customerId,
    dateDelivered,
    approvedBy,
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

      if (!revenue) {
        revenue = sellingPrice * amount;
      }

      if (!profit) {
        profit = revenue - (amount * checkProduct.price);
      }

      const newTransanction = new Transaction({
        productId,
        amount,
        sellingPrice,
        revenue,
        profit,
        customerName,
        customerPhone,
        customerAddress,
        customerId,
        dateDelivered,
        approvedBy,
      });

      const transactionCreated = await newTransanction.save();

      purchaseOrder.transactions.push(transactionCreated);
      purchaseOrder.ordersCompleted += amount;
      if (purchaseOrder.ordersCompleted === purchaseOrder.totalAmount) {
        purchaseOrder.status = 'COMPLETED';
      }
      await purchaseOrder.save();

      const elasticSearchPayload = {
        ...transactionCreated._doc,
        orderId,
        productName: checkProduct.name,
        productCategory: checkProduct.category,
        productPrice: checkProduct.price,
        revenue,
        profit,
        purchaseOrderDueDate: purchaseOrder.dueDate,
      };

      delete elasticSearchPayload._id;

      axios({
        method: 'PUT',
        url: `https://search-curly-lamp-qwjbn5oanez2yfrq5al4oorw5y.ap-southeast-1.es.amazonaws.com/transactions/_doc/${transactionCreated._id}`,
        data: elasticSearchPayload,
      });

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
};
