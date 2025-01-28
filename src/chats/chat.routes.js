const express = require('express');
const chatController = require('./chat.controller');

const router = express.Router();

router.get('/', chatController.getChats);
router.get('/fetchTotalChatsByShopId', chatController.getTotalChatsByShopId);
router.get('/fetchTotalRevenueByShopId', chatController.fetchTotalRevenueByShopId);
router.get('/fetchTotalUserMessagesTimeSeries',chatController.fetchTotalUserMessagesTimeSeries)
router.get('/fetchUserMessagesPerChat',chatController.fetchUserMessagesPerChat)
router.get('/fetchEngagedChatsTimeSeries',chatController.fetchEngagedChatsTimeSeries)
router.get('/fetchTotalChatDurationTimeSeries',chatController.fetchTotalChatDurationTimeSeries)
router.get('/fetchRecommendedProductsCount',chatController.fetchRecommendedProductsCount)
router.get('/fetchClickedProductsCount',chatController.fetchClickedProductsCount)
router.get('/fetchAvgChatDurationTimeSeries',chatController.fetchAvgChatDurationTimeSeries)
router.get('/fetchTotalChatsWithUserProduct',chatController.fetchTotalChatsWithUserProduct) 

module.exports = router;
