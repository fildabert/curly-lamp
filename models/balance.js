/* eslint-disable linebreak-style */
/* eslint-disable no-useless-escape */
/* eslint-disable func-names */
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const balanceSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'amount is required'],
  },

}, { timestamps: true });

module.exports = mongoose.model('Balance', balanceSchema);
