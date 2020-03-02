/* eslint-disable no-useless-escape */
/* eslint-disable func-names */
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const notificationSchema = new mongoose.Schema({
  token: {
    type: String,
    required: [true, 'name is empty'],
  },
  user: {
    type: ObjectId,
    ref: 'User',
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
