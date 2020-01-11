/* eslint-disable no-console */
/* eslint-disable no-unused-vars */

const express = require('express');

const app = express();
const mongoose = require('mongoose');

const db = mongoose.connection;
const port = 3000;
const cors = require('cors');
const routes = require('./routes/index');

require('dotenv').config();

const atlasURL = 'mongodb://fildabert2:fildabert2@hacktiv8aws-shard-00-00-87bq4.mongodb.net:27017,hacktiv8aws-shard-00-01-87bq4.mongodb.net:27017,hacktiv8aws-shard-00-02-87bq4.mongodb.net:27017/curly-lamp?ssl=true&replicaSet=hacktiv8AWS-shard-0&authSource=admin&retryWrites=true&w=majority';
const mongodbLocal = 'mongodb://127.0.0.1:27017/curly-lamp';

mongoose.connect(atlasURL, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to the database');
});


app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


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

app.listen(port, () => console.log(`Listening on port ${port}!`));
