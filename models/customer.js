/* eslint-disable linebreak-style */
/* eslint-disable no-useless-escape */
/* eslint-disable func-names */
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'name is empty'],
  },
  address: {
    type: String,
  },
  phone: {
    type: String,
  },
  balance: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    enum: ['BUYER', 'SUPPLIER'],
  },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
