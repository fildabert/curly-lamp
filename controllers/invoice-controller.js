/* eslint-disable no-async-promise-executor */
/* eslint-disable linebreak-style */
/* eslint-disable no-useless-escape */
/* eslint-disable func-names */

const moment = require('moment');
const e = require('express');
const Invoice = require('../models/invoice');
const Customer = require('../models/customer');
const invoice = require('../models/invoice');

const findAllInvoiceBuyer = () => new Promise(async (resolve, reject) => {
  try {
    const invoices = await Invoice.find({ type: 'BUYER' }).populate('customer').populate('purchaseOrder').populate('transactions')
      .sort({ createdAt: 'desc' });
    return resolve(invoices);
  } catch (error) {
    return reject(error);
  }
});

const findAllInvoiceSupplier = () => new Promise(async (resolve, reject) => {
  try {
    const invoices = await Invoice.find({ type: 'SUPPLIER' }).populate('customer').populate('purchaseOrder').populate('transactions');
    return resolve(invoices);
  } catch (error) {
    return reject(error);
  }
});

const createInvoice = ({
  customerId,
  purchaseOrderId,
  transactionId,
  invoiceDate,
  quantity,
  startDate,
  endDate,
  dueDate,
  totalAmount,
  paid = false,
  amountPaid = 0,
  type,
}) => new Promise(async (resolve, reject) => {
  try {
    const customer = await Customer.findOne({ _id: customerId });

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), { code: 400 });
    }

    if (customer.type === 'BUYER') {
      // 20 120 100
      if (customer.balance > 0) {
        if (customer.balance > totalAmount) {
          amountPaid = totalAmount;
        } else {
          amountPaid = customer.balance;
        }
      }
      customer.balance -= totalAmount;
    }

    const temp = new Invoice({
      customer: customerId,
      purchaseOrder: purchaseOrderId,
      transactions: transactionId,
      invoiceDate,
      dueDate: moment(new Date()).add(Number(dueDate), 'days'),
      startDate,
      endDate,
      quantity,
      totalAmount,
      paid: amountPaid === totalAmount,
      amountPaid,
      type,
    });
    const newInvoice = await temp.save();
    await customer.save();
    return resolve(newInvoice);
  } catch (error) {
    return reject(error);
  }
});

const updateInvoice = ({
  _id, customerId, topUpAmount,
}) => new Promise(async (resolve, reject) => {
  try {
    // 75,048,000
    const invoices = await Invoice.find({ customer: customerId, paid: false }).sort({ createdAt: 'asc' });

    const customer = await Customer.findOne({ _id: customerId });

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), { code: 400 });
    }

    const promises = [];

    customer.balance += topUpAmount;
    if (invoices.length > 0) {
      for (let i = 0; i < invoices.length; i += 1) {
        if (topUpAmount <= 0) {
          break;
        }
        let payAmount = 0;
        if (topUpAmount >= (invoices[i].totalAmount - invoices[i].amountPaid)) {
          payAmount = invoices[i].totalAmount - invoices[i].amountPaid;
          invoices[i].amountPaid += payAmount;
          topUpAmount -= payAmount;
        } else {
          payAmount = topUpAmount;
          invoices[i].amountPaid += payAmount;
          topUpAmount -= payAmount;
        }

        if (invoices[i].totalAmount === invoices[i].amountPaid) {
          invoices[i].paid = true;
        }
        promises.push(invoices[i].save());
      }
    }

    promises.push(customer.save());

    await Promise.all(promises);

    // let deduct = 0;
    // if (invoice.amountPaid < invoice.totalAmount) {
    //   // 100        100 - 20
    //   if (customer.balance >= (invoice.totalAmount - invoice.amountPaid)) {
    //     deduct = invoice.totalAmount - invoice.amountPaid;
    //     customer.balance -= deduct;
    //     invoice.amountPaid += deduct;
    //   } else {
    //     deduct = customer.balance;
    //     customer.balance -= deduct;
    //     invoice.amountPaid += deduct;
    //   }
    // }

    return resolve({ success: true });
  } catch (error) {
    return reject(error);
  }
});

const deleteInvoice = ({ _id }) => new Promise(async (resolve, reject) => {
  try {
    const invoice = await Invoice.findOne({ _id });
    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), { code: 400 });
    }

    await invoice.remove();
    return resolve({ success: 1 });
  } catch (error) {
    return reject(error);
  }
});

module.exports = {
  findAllInvoiceBuyer,
  findAllInvoiceSupplier,
  updateInvoice,
  createInvoice,
  deleteInvoice,
};
