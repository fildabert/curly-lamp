/* eslint-disable linebreak-style */
/* eslint-disable no-useless-escape */
/* eslint-disable func-names */
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const invoiceInfoSchema = new mongoose.Schema({
  product: {
    type: ObjectId,
    ref: 'Product',
    required: [true, 'productId is required'],
  },
  totalQuantity: {
    type: Number,
    required: [true, 'totalQuantity is required'],
  },
  price: {
    type: String,
  },

}, { timestamps: true });

module.exports = mongoose.model('InvoiceInfo', invoiceInfoSchema);
