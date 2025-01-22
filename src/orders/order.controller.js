const orderService = require('./order.service');

const getOrders = async (req, res) => {
  try {
    const orders = await orderService.getOrders();
    res.status(200).json(orders);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getOrders };
