/* eslint-disable linebreak-style */
const express = require('express');

const router = express.Router();

const userRoute = require('./user-route');
const transactionRoute = require('./transaction-route');
const productRoute = require('./product-route');
const purchaseOrderRoute = require('./purchase-order-route');
const customerRoute = require('./customer-route');
const invoiceRoute = require('./invoice-router');
const cashFlowRoute = require('./cashflow-route');

router.post('/ping', (req, res) => res.status(200).json('PING CURLY LAMP'));

router.use('/users', userRoute);
router.use('/transactions', transactionRoute);
router.use('/products', productRoute);
router.use('/purchase-orders', purchaseOrderRoute);
router.use('/customers', customerRoute);
router.use('/invoices', invoiceRoute);
router.use('/cashflows', cashFlowRoute);

module.exports = router;
