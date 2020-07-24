/* eslint-disable no-underscore-dangle */
/* eslint-disable no-async-promise-executor */
/* eslint-disable linebreak-style */
/* eslint-disable no-useless-escape */
/* eslint-disable func-names */

const moment = require('moment');
const Invoice = require('../models/invoice');
const Customer = require('../models/customer');
const CashFlow = require('../models/cashflow');
const Balance = require('../models/balance');
const PurchaseOrder = require('../models/purchase-order');

const balanceId = '5f054d0d60d1e55b14f5723d';

// const CashFlowController = require('./cashflow-contoller');

// console.log(CashFlowController)

const createInvoiceAgent = ({
  purchaseOrder, startDate, endDate, invoiceDate, dueDate, name,
}) => new Promise(async (resolve, reject) => {
  try {
    const result = {};
    const invoiceAgents = [];
    const agentFees = {};
    const agentQuantity = {};
    const transactionz = [];
    purchaseOrder.forEach((PO) => {
      transactionz.push(...PO.transactions);
      PO.transactions.forEach((trx) => {
        for (let i = 0; i < PO.additionalFee.length; i += 1) {
          if (trx.productId._id.toString() === PO.additionalFee[i].product.toString()) {
            if (!agentFees[PO.additionalFee[i].customer.toString()]) {
              agentFees[PO.additionalFee[i].customer.toString()] = 0;
            }
            console.log(trx.actualAmount, PO.additionalFee[i].amount);
            agentFees[PO.additionalFee[i].customer.toString()] += trx.actualAmount * PO.additionalFee[i].amount;

            if (!agentQuantity[PO.additionalFee[i].customer.toString()]) {
              agentQuantity[PO.additionalFee[i].customer.toString()] = 0;
            }
            agentQuantity[PO.additionalFee[i].customer.toString()] += trx.actualAmount;
          }
        }
      });
    });
    const agentIds = Object.keys(agentFees);

    agentIds.forEach((agentId) => {
      invoiceAgents.push(Invoice.create({
        customer: agentId,
        name,
        purchaseOrder,
        transactions: transactionz,
        invoiceDate,
        dueDate: moment(new Date()).add(Number(dueDate), 'days'),
        startDate,
        endDate,
        quantity: agentQuantity[agentId],
        totalAmount: agentFees[agentId],
        paid: false,
        amountPaid: 0,
        type: 'AGENT',
      }));
    });

    await Promise.all(invoiceAgents);
    return resolve(true);
  } catch (error) {
    console.log(error);
    reject(error);
  }
});

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
    const invoices = await Invoice.find({ $or: [{ type: 'SUPPLIER' }, { type: 'AGENT' }] }).populate('customer').populate('purchaseOrder').populate('transactions');
    return resolve(invoices);
  } catch (error) {
    return reject(error);
  }
});

const createInvoice = ({
  customerId,
  name,
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
    await createInvoiceAgent({
      purchaseOrder: purchaseOrderId, startDate, endDate, dueDate, invoiceDate, name,
    });

    const temp = new Invoice({
      customer: customerId,
      name,
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

    await customer.save();

    const result = await Promise.all(promises);

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

    return resolve(result);
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

    const checkCashFlow = await CashFlow.find({ invoices: { $elemMatch: { $in: [invoice._id] } } });

    if (checkCashFlow.length > 0) {
      throw Object.assign(new Error('Please delete all Cash Flows associated with this invoice first'), { code: 400 });
    }

    const customer = await Customer.findOne({ _id: invoice.customer });

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), { code: 400 });
    }

    const refund = invoice.totalAmount;

    customer.balance += refund;

    const promises = [];

    await Promise.all(promises);
    if (customer.type === 'BUYER') await customer.save();

    await invoice.remove();
    return resolve({ success: 1 });
  } catch (error) {
    return reject(error);
  }
});

const editInvoice = ({ _id, name }) => new Promise(async (resolve, reject) => {
  try {
    const invoice = await Invoice.findOne({ _id });

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), { code: 400 });
    }

    invoice.name = name || invoice.name;

    await invoice.save();

    return resolve(true);
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
  editInvoice,
};
