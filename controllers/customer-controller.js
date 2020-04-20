/* eslint-disable no-async-promise-executor */
const Customer = require('../models/customer');
const PurchaseOrder = require('../models/purchase-order');
const Transaction = require('../models/transaction');

module.exports = {
  findAllCustomer: () => new Promise(async (resolve, reject) => {
    try {
      const customers = await Customer.find({});
      return resolve(customers);
    } catch (error) {
      return reject(error);
    }
  }),

  createCustomer: ({ name, phone, address }) => new Promise(async (resolve, reject) => {
    try {
      const customer = new Customer({ name, phone, address });

      const newCustomer = await customer.save();
      return resolve(newCustomer);
    } catch (error) {
      return reject(error);
    }
  }),

  editCustomer: (customerId, payload) => new Promise(async (resolve, reject) => {
    try {
      const { name, phone, address } = payload;
      const customer = await Customer.findOne({ _id: customerId });
      if (!customer) {
        throw Object.assign(new Error('Customer not found'), { code: 400 });
      }
      customer.name = name || customer.name;
      customer.phone = phone || customer.phone;
      customer.address = address || customer.address;

      const updatedCustomer = await customer.save();
      return resolve(updatedCustomer);
    } catch (error) {
      return reject(error);
    }
  }),

  deleteCustomer: (customerId) => new Promise(async (resolve, reject) => {
    try {
      const customer = await Customer.findOne({ _id: customerId });
      if (!customer) {
        throw Object.assign(new Error('Customer not found'), { code: 400 });
      }
      await customer.remove();
      return resolve(true);
    } catch (error) {
      return reject(error);
    }
  }),

  refreshCustomer: () => new Promise(async (resolve, reject) => {
    try {
      const POs = await PurchaseOrder.find({ type: 'BUYER', status: 'ACTIVE' });
      // const transactions = await Transaction.find({});

      POs.forEach(async (PO) => {
        if (!PO.customerId) {
          const checkCustomer = await Customer.findOne({ name: PO.customerName });
          if (!checkCustomer) {
            const cust = new Customer({ name: PO.customerName });
            const newCust = await cust.save();
            PO.customerId = newCust._id;
            await PO.save();
          } else {
            PO.customerId = checkCustomer._id;
            await PO.save();
          }
        }
        // PO.customerId = null;
        // await PO.save();
      });
      return resolve(true);
    } catch (error) {
      return reject(error);
    }
  }),

};
