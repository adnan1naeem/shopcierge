const Shop = require('./shop.model');

const getShops = async () => {
  return await Shop.find();
};

module.exports = { getShops };
