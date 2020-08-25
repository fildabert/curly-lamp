/* eslint-disable no-underscore-dangle */
/* eslint-disable no-async-promise-executor */
/* eslint-disable linebreak-style */
/* eslint-disable no-useless-escape */
/* eslint-disable func-names */

const moment = require('moment');
const e = require('express');
const Invoice = require('../models/invoice');
const Customer = require('../models/customer');
const CashFlow = require('../models/cashflow');
const Balance = require('../models/balance');
const InvoiceInfo = require('../models/invoice-info');
const PurchaseOrder = require('../models/purchase-order');
const cashflow = require('../models/cashflow');

const balanceId = '5f054d0d60d1e55b14f5723d';

// const CashFlowController = require('./cashflow-contoller');

// console.log(CashFlowController)
const createInvoiceInfo = (transactions, type, agentPrice) => new Promise(async (resolve, reject) => {
  try {
    const invoiceInfoz = [];
    const promises = [];
    transactions.forEach((trx) => {
      const index = invoiceInfoz.findIndex((invoiceInfo) => invoiceInfo.product === trx.productId._id.toString());
      if (index === -1) {
        let price;
        if (type === 'BUYER') price = trx.sellingPrice;
        else if (type === 'SUPPLIER') price = trx.buyingPrice;
        else if (type === 'AGENT') price = agentPrice;
        invoiceInfoz.push({
          product: trx.productId._id.toString(),
          totalQuantity: trx.actualAmount,
          price,
        });
      } else {
        invoiceInfoz[index].totalQuantity += trx.actualAmount;
      }
    });

    invoiceInfoz.forEach((invoiceInfo) => {
      const temp = new InvoiceInfo(invoiceInfo);
      promises.push(temp.save());
    });
    const result = await Promise.all(promises);
    resolve(result);
  } catch (error) {
    reject(error);
  }
});

const createInvoiceAgent = ({
  purchaseOrder, startDate, endDate, invoiceDate, dueDate, name,
}) => new Promise(async (resolve, reject) => {
  try {
    const agentFees = {};
    const agentQuantity = {};
    const agentPrice = {};
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

            if (!agentPrice[PO.additionalFee[i].customer.toString()]) {
              agentPrice[PO.additionalFee[i].customer.toString()] = PO.additionalFee[i].amount;
            }
          }
        }
      });
    });
    const agentIds = Object.keys(agentFees);

    const invoiceInfosPromise = [];

    agentIds.forEach((agentId) => {
      invoiceInfosPromise.push(createInvoiceInfo(transactionz, 'AGENT', agentPrice[agentId]));
    });

    const invoiceInfos = await Promise.all(invoiceInfosPromise);

    const invoiceAgents = [];
    agentIds.forEach((agentId, index) => {
      invoiceAgents.push(Invoice.create({
        customer: agentId,
        name,
        purchaseOrder,
        transactions: transactionz,
        invoiceInfos: invoiceInfos[index],
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

const findOneInvoice = ({ _id }) => new Promise(async (resolve, reject) => {
  try {
    const invoice = await Invoice.findOne({ _id }).populate('customer').populate('purchaseOrder').populate('transactions')
      .populate({ path: 'invoiceInfos', populate: { path: 'product' } })
      .lean();
    return resolve(invoice);
  } catch (error) {
    return reject(error);
  }
});

const findAllInvoiceBuyer = () => new Promise(async (resolve, reject) => {
  try {
    const invoices = await Invoice.find({ type: 'BUYER' }).populate('customer').populate('purchaseOrder')
      .populate({ path: 'invoiceInfos', populate: { path: 'product' } })
      .sort({ createdAt: 'desc' })
      .lean();
    return resolve(invoices);
  } catch (error) {
    return reject(error);
  }
});

const findAllInvoiceSupplier = () => new Promise(async (resolve, reject) => {
  try {
    const invoices = await Invoice.find({ $or: [{ type: 'SUPPLIER' }, { type: 'AGENT' }] }).populate('customer').populate('purchaseOrder')
      .populate({ path: 'invoiceInfos', populate: { path: 'product' } })
      .sort({ createdAt: 'desc' })
      .lean();
    return resolve(invoices);
  } catch (error) {
    return reject(error);
  }
});

const updateInvoice = ({
  _id, customerId, topUpAmount,
}) => new Promise(async (resolve, reject) => {
  try {
    // 75,048,00012233
    const invoices = await Invoice.find({ customer: customerId }).sort({ createdAt: 'asc' });

    const cashFlows = await CashFlow.find({ customer: customerId }).sort({ dateIssued: 'asc' });

    let invoiceIndex = 0;

    let totalCustomerCashFlow = 0;
    let totalCustomerInvoice = 0;

    invoices.forEach((invoice) => {
      invoice.amountPaid = 0;
      totalCustomerInvoice += invoice.totalAmount;
    });

    cashFlows.forEach((cashFlow) => {
      let cashFlowAmount = cashFlow.amount;
      cashFlow.invoices = [];
      if (invoiceIndex < invoices.length) {
        while (cashFlowAmount !== 0) {
          // console.log(cashFlowAmount);
          if (invoiceIndex >= invoices.length) {
            break;
          }
          const amountToBePaid = invoices[invoiceIndex].totalAmount - invoices[invoiceIndex].amountPaid;
          if (cashFlowAmount >= amountToBePaid) {
            invoices[invoiceIndex].amountPaid += amountToBePaid;
            cashFlow.invoices.push(invoices[invoiceIndex]._id);
            invoiceIndex += 1;
            cashFlowAmount -= amountToBePaid;
          } else {
            invoices[invoiceIndex].amountPaid += cashFlowAmount;
            cashFlowAmount = 0;
            cashFlow.invoices.push(invoices[invoiceIndex]._id);
          }
        }
        // console.log(cashFlow);
      }
      totalCustomerCashFlow += cashFlow.amount;
    });

    const customer = await Customer.findOne({ _id: customerId });

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), { code: 400 });
    }
    customer.balance = totalCustomerCashFlow - totalCustomerInvoice;
    const promises = [];

    promises.push(customer.save());

    cashFlows.forEach((cashFlow) => {
      promises.push(cashFlow.save());
    });

    invoices.forEach((invoice) => {
      if (invoice.totalAmount === invoice.amountPaid) {
        invoice.paid = true;
      } else {
        invoice.paid = false;
      }
      promises.push(invoice.save());
    });
    // customer.balance += topUpAmount;
    // if (invoices.length > 0) {
    //   for (let i = 0; i < invoices.length; i += 1) {
    //     if (topUpAmount <= 0) {
    //       break;
    //     }
    //     let payAmount = 0;
    //     if (topUpAmount >= (invoices[i].totalAmount - invoices[i].amountPaid)) {
    //       payAmount = invoices[i].totalAmount - invoices[i].amountPaid;
    //       invoices[i].amountPaid += payAmount;
    //       topUpAmount -= payAmount;
    //     } else {
    //       payAmount = topUpAmount;
    //       invoices[i].amountPaid += payAmount;
    //       topUpAmount -= payAmount;
    //     }

    //     if (invoices[i].totalAmount === invoices[i].amountPaid) {
    //       invoices[i].paid = true;
    //     }
    //     promises.push(invoices[i].save());
    //   }
    // }

    const result = await Promise.all(promises);

    return resolve(result);
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

    // if (customer.type === 'BUYER') {
    //   // 20 120 100
    //   if (customer.balance > 0) {
    //     if (customer.balance > totalAmount) {
    //       amountPaid = totalAmount;
    //     } else {
    //       amountPaid = customer.balance;
    //     }
    //   }
    //   customer.balance -= totalAmount;
    // }

    await createInvoiceAgent({
      purchaseOrder: purchaseOrderId, startDate, endDate, dueDate, invoiceDate, name,
    });

    const invoiceInfos = await createInvoiceInfo(transactionId, type);

    const temp = new Invoice({
      customer: customerId,
      name,
      purchaseOrder: purchaseOrderId,
      transactions: transactionId,
      invoiceInfos,
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
    // await customer.save();

    await updateInvoice({ customerId });
    return resolve(newInvoice);
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

const editInvoice = ({
  _id, name, dueDate, invoiceInfos,
}) => new Promise(async (resolve, reject) => {
  try {
    const invoice = await Invoice.findOne({ _id });
    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), { code: 400 });
    }

    const customer = await Customer.findOne({ _id: invoice.customer });
    if (!customer) {
      throw Object.assign(new Error('Customer not found'), { code: 400 });
    }

    invoice.name = name || invoice.name;
    invoice.dueDate = new Date(dueDate) || invoice.dueDate;
    invoice.invoiceInfos = invoiceInfos || invoice.invoiceInfos;

    let newTotalQuantity = 0;
    let newTotalAmount = 0;
    const invoiceInfosPromise = [];
    invoiceInfos.forEach((invoiceInfo) => {
      newTotalAmount += (invoiceInfo.totalQuantity * invoiceInfo.price);
      newTotalQuantity += invoiceInfo.totalQuantity;
      invoiceInfosPromise.push(
        InvoiceInfo.updateOne(
          { _id: invoiceInfo._id },
          { totalQuantity: invoiceInfo.totalQuantity, price: invoiceInfo.price },
        ),
      );
    });

    await Promise.all(invoiceInfosPromise);

    customer.balance += invoice.totalAmount - newTotalAmount;

    invoice.quantity = newTotalQuantity;
    invoice.totalAmount = newTotalAmount;

    await customer.save();
    await invoice.save();

    return resolve(true);
  } catch (error) {
    return reject(error);
  }
});

const temp = () => new Promise(async (resolve, reject) => {
  try {
    const invoices = await Invoice.find({ type: 'SUPPLIER' }).populate('transactions');
    console.log(invoices.length);
    const promises = [];

    invoices.forEach(async (invoice) => {
      const invoiceInfoz = [];
      invoice.transactions.forEach((trx) => {
        const index = invoiceInfoz.findIndex((invoiceInfo) => invoiceInfo.product === trx.productId.toString());
        if (index === -1) {
          invoiceInfoz.push({
            product: trx.productId.toString(),
            totalQuantity: trx.actualAmount,
            price: trx.buyingPrice,
          });
        } else {
          invoiceInfoz[index].totalQuantity += trx.actualAmount;
        }
      });
      invoiceInfoz.forEach(async (invoiceInfo) => {
        const temp = new InvoiceInfo(invoiceInfo);
        const newInvoiceInfo = await temp.save();
        invoice.invoiceInfos.push(newInvoiceInfo);
        console.log('push invoice');
      });
      await setTimeout(() => {
        promises.push(invoice.save());
        console.log(invoice.invoiceInfos);
      }, 500);
    });
    await setTimeout(async () => {
      const asd = await Promise.all(promises);
      console.log('ASDASD');
    }, 10000);
    resolve(true);
  } catch (error) {
    return reject(error);
  }
});

module.exports = {
  temp,
  findAllInvoiceBuyer,
  findAllInvoiceSupplier,
  updateInvoice,
  createInvoice,
  deleteInvoice,
  editInvoice,
  findOneInvoice,
};
