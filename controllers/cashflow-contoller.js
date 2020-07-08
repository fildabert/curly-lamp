/* eslint-disable no-async-promise-executor */
/* eslint-disable linebreak-style */
const CashFlow = require('../models/cashflow');
const Balance = require('../models/balance');
const Customer = require('../models/customer');
const InvoiceController = require('./invoice-controller');

const balanceId = '5f054d0d60d1e55b14f5723d';

const createCashFlow = ({ customerId, amount }) => new Promise(async (resolve, reject) => {
  try {
    const customer = await Customer.findOne({ _id: customerId });

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), { code: 400 });
    }

    const temp = new CashFlow({ customer: customerId, amount });
    const newCashFlow = await temp.save();

    const accBalance = await Balance.findOne({ _id: balanceId });

    if (customer.type === 'BUYER') {
      accBalance.amount += amount;
    } else if (customer.type === 'SUPPLIER') {
      accBalance.amount -= amount;
    }
    await accBalance.save();
    const aa = await InvoiceController.updateInvoice({ customerId, topUpAmount: amount });

    return resolve(newCashFlow);
  } catch (error) {
    return reject(error);
  }
});

const findAllCashFlow = () => new Promise(async (resolve, reject) => {
  try {
    const cashFlows = await CashFlow.find({}).populate('customer');
    return resolve(cashFlows);
  } catch (error) {
    return reject(error);
  }
});

const getBalance = () => new Promise(async (resolve, reject) => {
  try {
    const balance = await Balance.findOne({ _id: balanceId });
    return resolve(balance);
  } catch (error) {
    return reject(error);
  }
});

const deleteCashFlow = ({ _id }) => new Promise(async (resolve, reject) => {
  try {
    const cashFlow = await CashFlow.findOne({ _id });
    const balance = await Balance.findOne({ _id: balanceId });

    if (!cashFlow) {
      throw Object.assign(new Error('Customer not found'), { code: 400 });
    }

    balance.amount -= cashFlow.amount;

    await cashFlow.remove();
    await balance.save();
    return resolve({ success: true });
  } catch (error) {
    return reject(error);
  }
});

module.exports = {
  createCashFlow,
  getBalance,
  findAllCashFlow,
  deleteCashFlow,
};
