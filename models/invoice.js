/* eslint-disable linebreak-style */
/* eslint-disable no-useless-escape */
/* eslint-disable func-names */
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const invoiceSchema = new mongoose.Schema({
  customer: {
    type: ObjectId,
    ref: 'Customer',
    required: [true, 'customer is empty'],
  },
  name: {
    type: String,
    required: [true, 'invoice name is required'],
  },
  purchaseOrder: [{
    type: ObjectId,
    ref: 'PurchaseOrder',
  }],
  transactions: [{ type: ObjectId, ref: 'Transaction' }],
  invoiceInfos: [{ type: ObjectId, ref: 'InvoiceInfo' }],
  invoiceDate: {
    type: Date,
    required: [true, 'invoiceDate is empty'],
  },
  startDate: {
    type: Date,
    required: [true, 'startDate is empty'],
  },
  endDate: {
    type: Date,
    required: [true, 'endDate is empty'],
  },
  dueDate: {
    type: Date,
    required: [true, 'dueDate is empty'],
  },
  quantity: {
    type: Number,
    required: [true, 'quantity is empty'],
  },
  totalAmount: {
    type: Number,
    required: [true, 'totalAmount is empty'],
  },
  paid: {
    type: Boolean,
    default: false,
  },
  amountPaid: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    enum: ['BUYER', 'SUPPLIER', 'AGENT'],
    required: [true, 'type cannot be empty'],
  },

}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
