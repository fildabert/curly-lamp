/* eslint-disable linebreak-style */
/* eslint-disable no-useless-escape */
/* eslint-disable func-names */
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const feeSchema = new mongoose.Schema({
  product: {
    type: ObjectId,
    ref: 'Product',
    required: [true, 'productId is required'],
  },
  amount: {
    type: Number,
    required: [true, 'amount is required'],
  },
  customer: {
    type: ObjectId,
    ref: 'Customer',
  },
  customerName: {
    type: String,
  },
  productName: {
    type: String,
  },

}, { timestamps: true });

module.exports = mongoose.model('Fee', feeSchema);
