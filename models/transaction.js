/* eslint-disable no-useless-escape */
/* eslint-disable func-names */
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const transactionSchema = new mongoose.Schema({
  productId: {
    type: ObjectId,
    ref: 'Product',
  },
  amount: {
    type: Number,
    required: [true, 'amount is empty'],
  },
  actualAmount: {
    type: Number,
    default: null,
  },
  invoice: {
    type: String,
    default: null,
  },
  buyingPrice: {
    type: Number,
    default: null,
  },
  sellingPrice: {
    type: Number,
    default: null,
    // required: [true, 'sellingPrice (per unit) is empty'],
  },
  revenue: {
    type: Number,
  },
  profit: {
    type: Number,
  },
  customerName: {
    type: String,
    required: [true, 'customerName is empty'],
  },
  customerPhone: {
    type: String,
    required: [true, 'customerPhone is empty'],
  },
  customerAddress: {
    type: String,
    required: [true, 'customerAddress is empty'],
  },
  customerId: {
    type: ObjectId,
    ref: 'Customer',
  },
  dateDelivered: {
    type: Date,
    // required: [true, 'dueDate is empty'],
  },
  status: {
    type: String,
  },
  dateReceived: {
    type: Date,
  },
  dueDate: {
    type: Date,
    // required: [true, 'dueDate is empty'],
  },
  type: {
    type: String,
    enum: ['BUYER', 'SUPPLIER'],
  },
  approvedBy: {
    type: ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
