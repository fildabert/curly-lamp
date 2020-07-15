/* eslint-disable no-underscore-dangle */
/* eslint-disable no-async-promise-executor */
/* eslint-disable linebreak-style */
const CashFlow = require('../models/cashflow');
const Balance = require('../models/balance');
const Customer = require('../models/customer');
const Invoice = require('../models/invoice');
const InvoiceController = require('./invoice-controller.js');

const balanceId = '5f054d0d60d1e55b14f5723d';

const createCashFlow = ({ customerId, amount }) => new Promise(async (resolve, reject) => {
  try {
    const customer = await Customer.findOne({ _id: customerId });

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), { code: 400 });
    }

    const temp = new CashFlow({ customer: customerId, amount });

    const accBalance = await Balance.findOne({ _id: balanceId });

    if (customer.type === 'BUYER') {
      accBalance.amount += amount;
    } else if (customer.type === 'SUPPLIER' || customer.type === 'AGENT') {
      accBalance.amount -= amount;
    }
    await accBalance.save();
    const invoices = await InvoiceController.updateInvoice({ customerId, topUpAmount: amount });

    temp.invoices = invoices.map((invoice) => invoice._id);
    console.log(temp.invoices);
    const newCashFlow = await temp.save();

    return resolve(newCashFlow);
  } catch (error) {
    return reject(error);
  }
});

const findAllCashFlow = () => new Promise(async (resolve, reject) => {
  try {
    const cashFlows = await CashFlow.find({}).populate('customer').populate('invoices');
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
    const cashFlow = await CashFlow.findOne({ _id }).populate('invoices');
    const balance = await Balance.findOne({ _id: balanceId });

    // invoice 1 100
    // invoice 2 100
    // cashflow 1 120
    if (!cashFlow) {
      throw Object.assign(new Error('Cashflow not found'), { code: 400 });
    }
    const customer = await Customer.findOne({ _id: cashFlow.customer });
    if (!customer) {
      throw Object.assign(new Error('Customer not found'), { code: 400 });
    }

    const promises = [];
    // eslint-disable-next-line prefer-destructuring
    let amount = cashFlow.amount;
    if (customer.type === 'BUYER') {
      customer.balance -= amount;
    }
    for (let i = 0; i < cashFlow.invoices.length; i += 1) {
      if (amount === 0) {
        break;
      }
      if ((cashFlow.invoices[i].amountPaid - amount) < 0) {
        // eslint-disable-next-line operator-assignment
        amount -= cashFlow.invoices[i].amountPaid;
        cashFlow.invoices[i].amountPaid = 0;
      } else {
        cashFlow.invoices[i].amountPaid -= amount;
        amount = 0;
      }

      if (cashFlow.invoices[i].amountPaid !== cashFlow.invoices[i].totalAmount) {
        cashFlow.invoices[i].paid = false;
      }

      promises.push(cashFlow.invoices[i].save());
    }
    console.log(promises);
    await Promise.all(promises);

    if (customer.type === 'BUYER') {
      balance.amount -= cashFlow.amount;
    } else if (customer.type === 'SUPPLIER' || customer.type === 'AGENT') {
      balance.amount += cashFlow.amount;
    }
    await customer.save();
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
