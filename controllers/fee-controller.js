/* eslint-disable no-async-promise-executor */
/* eslint-disable linebreak-style */
const Fee = require('../models/fee');

const createFee = ({productId, productName, amount, customerId, customerName}) => new Promise(async (resolve, reject) => {
  try {
    let fee = await Fee.findOne({ product: productId, amount, customer: customerId });

    if (!fee) {
      const newFee = new Fee({ product: productId, amount, customer: customerId, productName, customerName });
      fee = await newFee.save();
    }

    return resolve(fee);
  } catch (error) {
    return reject(error);
  }
});

module.exports = {
  createFee,
};
