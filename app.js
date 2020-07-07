/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
// require('newrelic');
const express = require('express');
const bodyParser = require('body-parser');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const app = express();
const mongoose = require('mongoose');

const db = mongoose.connection;
const port = process.env.PORT || 3000;
const cors = require('cors');
const routes = require('./routes/index');

require('dotenv').config();

const atlasURL = process.env.ATLAS_URL;
const mongodbLocal = 'mongodb://127.0.0.1:27017/curly-lamp';

mongoose.connect(atlasURL, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to the database');
});


app.use(cors());
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(express.json({limit: '50mb'}));


app.use('/', routes);

app.use((err, req, res, next) => {
  console.log('Error:', err.message);
  if (err.code === 404) {
    res.status(404).json({ message: err.message, ...err });
  } else if (err.code === 401) {
    res.status(401).json({ message: err.message, ...err });
  } else if (err.code === 400) {
    res.status(400).json({ message: err.message, ...err });
  } else if (err.name === 'MongoError' && err.code === 11000) {
    const newerr = err.message.split(' ');
    res.status(400).json(`${newerr[7].split('_')[0]} : ${newerr[12]} already exist`);
  } else if (err.name === 'ValidationError') {
    res.status(400).json(err.message);
  } else {
    console.log(err);
    res.status(500).json(
      'Internal server error',
    );
  }
});

app.listen(port, () => console.log(`Worker ${process.pid} is listening on port ${port}!`));


// if (cluster.isMaster) {
//   for (let i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }

//   cluster.on('online', (worker) => {
//     console.log(`Worker ${worker.process.pid} is online.`);
//   });
//   cluster.on('exit', (worker, code, signal) => {
//     console.log(`worker ${worker.process.pid} died.`);
//   });
// } else {
//   app.listen(port, () => console.log(`Worker ${process.pid} is listening on port ${port}!`));
// }

module.exports = app;
