/* eslint-disable no-underscore-dangle */
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

// const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
purchaseOrderSchema.pre('save', async function (next) {
  console.log('KONTOL');
  await asd(this._id);
  next();
});


// eslint-disable-next-line no-multi-assign
const PurchaseOrder = module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);

async function asd(orderId) {
  const PO = await PurchaseOrder.findOne({ _id: orderId }).populate('transactions');
  let ordersCompleted = 0;
  console.log(PO, "HOOK");
  PO.transactions.forEach((transaction) => {
    ordersCompleted += transaction.actualAmount || transaction.amount;
  });
  PO.ordersCompleted = ordersCompleted;
  await PO.save();
}
