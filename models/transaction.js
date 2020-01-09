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
  sellingPrice: {
    type: Number,
    required: [true, 'sellingPrice (per unit) is empty'],
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
    required: [true, 'dueDate is empty'],
  },
  status: {
    type: String,
  },
  dateReceived: {
    type: Date,
  },
  approvedBy: {
    type: ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
