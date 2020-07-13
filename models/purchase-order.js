/* eslint-disable linebreak-style */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-useless-escape */
/* eslint-disable func-names */
const mongoose = require('mongoose');
const Transaction = require('./transaction');

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
  additionalFee: [{
    type: ObjectId,
    ref: 'Fee',
  }],
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

async function asd(orderIdArr) {
  const transactions = await Transaction.find({ _id: { $in: orderIdArr } }).lean();
  let ordersCompleted = 0;
  transactions.forEach((transaction) => {
    if (transaction) {
      ordersCompleted += transaction.actualAmount || transaction.amount;
    }
  });
  return ordersCompleted;
}


// const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
purchaseOrderSchema.pre('save', async function () {
  const ordersCompleted = await asd(this.transactions);
  this.ordersCompleted = ordersCompleted;
  if (this.ordersCompleted >= this.totalAmount) {
    this.status = 'COMPLETED';
  }
});


// eslint-disable-next-line no-multi-assign
module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
