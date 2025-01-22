const express = require('express');
const shopController = require('./shop.controller');

const router = express.Router();

router.get('/', shopController.getShops);

module.exports = router;
