const express = require('express');
const chatController = require('./chat.controller');

const router = express.Router();

router.get('/', chatController.getChats);
router.get('/RecommendedProducts',chatController.fetchRecommendedProductsCount)
router.get('/ProductCount',chatController.fetchClickedProductsCount)
module.exports = router;
