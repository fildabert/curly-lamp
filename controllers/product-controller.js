/* eslint-disable no-underscore-dangle */
/* eslint-disable linebreak-style */
/* eslint-disable no-async-promise-executor */
const Product = require('../models/product');
const redisCache = require('../redis');

module.exports = {
  createProduct: ({
    name,
    price,
    stock,
    description,
    productImage,
    category,
    unit,
  }) => new Promise(async (resolve, reject) => {
    try {
      const buyingPriceHistory = [
        {
          price,
          date: new Date().toISOString(),
        },
      ];
      const newProduct = new Product({
        name,
        price,
        stock,
        description,
        category,
        productImage,
        unit,
        buyingPriceHistory,
      });
      await newProduct.save();
      redisCache.del('products');
      resolve(newProduct);
    } catch (error) {
      reject(error);
    }
  }),

  findAllProduct: () => new Promise((resolve, reject) => {
    try {
      redisCache.get('products', async (err, cache) => {
        if (cache) {
          resolve(JSON.parse(cache));
        } else {
          const result = await Product.find({ active: true }).sort({
            createdAt: 'desc',
          });
          redisCache.setex('products', 60 * 60, JSON.stringify(result));
          resolve(result);
        }
      });
    } catch (error) {
      reject(error);
    }
  }),

  findOneProduct: (productId) => new Promise(async (resolve, reject) => {
    try {
      const result = await Product.findOne({ _id: productId });
      if (!result) {
        throw Object.assign(new Error('Product Not Found'), { code: 400 });
      }
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }),

  searchProduct: (payload) => new Promise(async (resolve, reject) => {
    try {
      const result = await Product.find({
        name: { $regex: payload.name, $options: 'i' },
      });
      if (!result || result.length === 0) {
        throw Object.assign(new Error('No results found'), { code: 400 });
      }
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }),

  editProduct: (productId, payload) => new Promise(async (resolve, reject) => {
    const {
      name,
      price,
      stock,
      description,
      category,
      productImage,
      unit,
      scheduledPriceChange,
    } = payload;
    try {
      const newProduct = await Product.findOne({ _id: productId });
      console.log(payload, 'plis');
      if (price) {
        // eslint-disable-next-line max-len
        const lastPrice = newProduct.buyingPriceHistory[
          newProduct.buyingPriceHistory.length - 1
        ].price;
        if (lastPrice !== price) {
          newProduct.buyingPriceHistory.push({
            price,
            date: new Date().toISOString(),
          });
        }
      }

      if (!newProduct.scheduledPriceChanges) {
        newProduct.scheduledPriceChanges = [];
      }
      if (scheduledPriceChange) {
        // eslint-disable-next-line max-len
        const lastSchedule = newProduct.scheduledPriceChanges[
          newProduct.scheduledPriceChanges.length - 1
        ];

        const today00 = new Date().toISOString().split('T')[0];
        if (new Date(scheduledPriceChange.date) < new Date(today00)) {
          throw Object.assign(
            new Error(
              'Next scheduled date cannot be before today',
            ),
            { code: 400 },
          );
        }

        if (
          lastSchedule && new Date(scheduledPriceChange.date) <= new Date(lastSchedule.date)
        ) {
          throw Object.assign(
            new Error(
              'Next scheduled date cannot be before last scheduled date',
            ),
            { code: 400 },
          );
        }
        newProduct.scheduledPriceChanges.push(scheduledPriceChange);
      }

      newProduct.name = name || newProduct.name;
      newProduct.price = price || newProduct.price;
      newProduct.stock = stock || newProduct.stock;
      newProduct.description = description || newProduct.description;
      newProduct.category = category || newProduct.category;
      newProduct.productImage = productImage || newProduct.productImage;
      newProduct.unit = unit || newProduct.unit;

      const updatedProduct = await newProduct.save();
      redisCache.del('products');
      resolve(updatedProduct);
    } catch (error) {
      reject(error);
    }
  }),

  deleteProduct: (productId) => new Promise(async (resolve, reject) => {
    try {
      const targetProduct = await Product.findOne({ _id: productId });
      targetProduct.active = false;

      await targetProduct.save();
      redisCache.del('products');
      resolve({
        productId,
        success: true,
        message: 'Product is now inactive',
      });
    } catch (error) {
      reject(error);
    }
  }),

  removeSchedule: (productId, scheduleId) => new Promise(async (resolve, reject) => {
    try {
      const product = await Product.findOne({ _id: productId });
      const deleteIndex = product.scheduledPriceChanges.findIndex(
        (sched) => sched._id.toString() === scheduleId,
      );
      if (deleteIndex !== -1) {
        product.scheduledPriceChanges.splice(deleteIndex, 1);
      }
      await product.save();
      redisCache.del('products');
      resolve(true);
    } catch (error) {
      reject(error);
    }
  }),
};
