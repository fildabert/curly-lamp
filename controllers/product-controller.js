/* eslint-disable no-async-promise-executor */
const Product = require('../models/product');

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
      const newProduct = new Product({
        name, price, stock, description, category, productImage, unit,
      });
      await newProduct.save();
      resolve(newProduct);
    } catch (error) {
      reject(error);
    }
  }),

  findAllProduct: () => new Promise(async (resolve, reject) => {
    try {
      const result = await Product.find({ active: true });
      resolve(result);
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
      const result = await Product.find({ name: { $regex: payload.name, $options: 'i' } });
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
    } = payload;
    try {
      const newProduct = await Product.findOne({ _id: productId });

      newProduct.name = name || newProduct.name;
      newProduct.price = price || newProduct.price;
      newProduct.stock = stock || newProduct.stock;
      newProduct.description = description || newProduct.description;
      newProduct.category = category || newProduct.category;
      newProduct.productImage = productImage || newProduct.productImage;
      newProduct.unit = unit || newProduct.unit;

      const updatedProduct = await newProduct.save();
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
      resolve({ productId, success: true, message: 'Product is now inactive' });
    } catch (error) {
      reject(error);
    }
  }),
};