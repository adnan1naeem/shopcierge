const Order = require('./order.model');

const getOrders = async () => {
  return await Order.find();
};

module.exports = { getOrders };
