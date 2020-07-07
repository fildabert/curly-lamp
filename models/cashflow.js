/* eslint-disable linebreak-style */
/* eslint-disable no-useless-escape */
/* eslint-disable func-names */
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const cashFlowSchema = new mongoose.Schema({
  customer: {
    type: ObjectId,
    ref: 'Customer',
    required: [true, 'customer is empty'],
  },
  amount: {
    type: Number,
    required: [true, 'amount is required'],
  },

}, { timestamps: true });

module.exports = mongoose.model('CashFlow', cashFlowSchema);