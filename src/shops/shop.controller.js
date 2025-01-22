const shopService = require('./shop.service');

const getShops = async (req, res) => {
  try {
    const shops = await shopService.getShops();
    res.status(200).json(shops);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getShops };
