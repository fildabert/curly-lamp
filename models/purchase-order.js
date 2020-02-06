/* eslint-disable no-useless-escape */
/* eslint-disable func-names */
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const purchaseOrderSchema = new mongoose.Schema({
  productId: {
    type: ObjectId,
    ref: 'Product',
  },
  price: {
    type: Number,
    required: [true, 'price is empty'],
  },
  PONo: {
    type: String,
    default: null,
  },
  customerName: {
    type: String,
    required: [true, 'customerName is empty'],
  },
  customerPhone: {
    type: String,
  },
  customerAddress: {
    type: String,
  },
  customerId: {
    type: ObjectId,
    ref: 'Customer',
  },
  transactions: [{ type: ObjectId, ref: 'Transaction' }],
  totalAmount: {
    type: Number,
    required: [true, 'totalAmount is empty'],
  },
  ordersCompleted: {
    type: Number,
    default: 0,
  },
  approvedBy: {
    type: ObjectId,
    ref: 'User',
  },
  dueDate: {
    type: Date,
    // required: [true, 'dueDate is empty'],
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'CLOSED', 'DELETED'],
    default: 'ACTIVE',
  },
  type: {
    type: String,
    enum: ['BUYER', 'SUPPLIER'],
  },
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
