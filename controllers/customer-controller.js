/* eslint-disable linebreak-style */
/* eslint-disable no-async-promise-executor */
const Customer = require('../models/customer');
const PurchaseOrder = require('../models/purchase-order');
const Transaction = require('../models/transaction');

module.exports = {
  findAllCustomer: () => new Promise(async (resolve, reject) => {
    try {
      const customers = await Customer.find({ });
      return resolve(customers);
    } catch (error) {
      return reject(error);
    }
  }),
  findAllBuyer: () => new Promise(async (resolve, reject) => {
    try {
      const customers = await Customer.find({ type: 'BUYER' });
      return resolve(customers);
    } catch (error) {
      return reject(error);
    }
  }),
  findAllSuppliers: () => new Promise(async (resolve, reject) => {
    try {
      const suppliers = await Customer.find({ type: 'SUPPLIER' });
      return resolve(suppliers);
    } catch (error) {
      return reject(error);
    }
  }),
  findAllAgents: () => new Promise(async (resolve, reject) => {
    try {
      const agents = await Customer.find({ type: 'AGENT' });

      return resolve(agents);
    } catch (error) {
      return reject(error);
    }
  }),

  createCustomer: ({
    name, phone, address, type,
  }) => new Promise(async (resolve, reject) => {
    try {
      const customer = new Customer({
        name, phone, address, type,
      });

      const newCustomer = await customer.save();
      return resolve(newCustomer);
    } catch (error) {
      return reject(error);
    }
  }),

  editCustomer: (customerId, payload) => new Promise(async (resolve, reject) => {
    try {
      const {
        name, phone, address, balance,
      } = payload;
      const customer = await Customer.findOne({ _id: customerId });
      if (!customer) {
        throw Object.assign(new Error('Customer not found'), { code: 400 });
      }
      customer.name = name || customer.name;
      customer.phone = phone || customer.phone;
      customer.address = address || customer.address;
      customer.balance = balance || customer.balance;

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
      const POs = await PurchaseOrder.find({ type: 'SUPPLIER', $or: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }] });
      // const transactions = await Transaction.find({});

      POs.forEach(async (PO) => {
        if (!PO.customerId) {
          const checkCustomer = await Customer.findOne({ name: PO.customerName });
          if (!checkCustomer) {
            console.log(PO, 'notfound');
            const cust = new Customer({ name: PO.customerName, type: 'SUPPLIER' });
            const newCust = await cust.save();
            PO.customerId = newCust._id;
            await PO.save();
          } else {
            // console.log(checkCustomer, 'found');
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
