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
    required: [true, 'phone is empty'],
  },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
