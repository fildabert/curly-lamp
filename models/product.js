/* eslint-disable no-useless-escape */
/* eslint-disable func-names */
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'name is empty'],
  },
  price: {
    type: Number,
    required: [true, 'price is empty'],
  },
  stock: {
    type: Number,
    default: 0,
  },
  unit: {
    type: String,
  },
  description: {
    type: String,
  },
  productImage: {
    type: String,
  },
  category: {
    type: String,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
