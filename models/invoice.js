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
  purchaseOrder: {
    type: ObjectId,
    ref: 'PurchaseOrder',
    required: [true, 'purchaseOrder is empty'],
  },
  transactions: [{ type: ObjectId, ref: 'Transaction' }],
  invoiceDate: {
    type: Date,
    required: [true, 'invoiceDate is empty'],
  },
  dueDate: {
    type: Date,
    required: [true, 'dueDate is empty'],
  },
  totalAmount: {
    type: Number,
    required: [true, 'totalAmount is empty'],
  },
  paid: {
    type: Boolean,
    default: true,
  },
  amountPaid: {
    type: Number,
    default: 0,
  },

}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
