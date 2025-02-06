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
router.get('/getProductsSold',chatController.getProductsSold);
router.get('/fetchSalesFunnel',chatController.fetchSalesFunnel);
router.get('/fetchSupportChatsAnswered',chatController.fetchSupportChatsAnswered);
router.get('/fetchSupportChatsAnsweredPercentage',chatController.fetchSupportChatsAnsweredPercentage);
router.get('/fetchEstimatedTimeSaved',chatController.fetchEstimatedTimeSaved);
router.get('/fetchChatsByCategory',chatController.fetchChatsByCategory);
router.get('/fetchShoppingRelatedChatsPercentage',chatController.fetchShoppingRelatedChatsPercentage);
router.get('/fetchSupportChatCount',chatController.fetchSupportChatCount);
router.get('/fetchSupportChatsBySubcategory',chatController.fetchSupportChatsBySubcategory);
router.get('/fetchChatEscalations',chatController.fetchChatEscalations);
router.get('/fetchTotalVisitors',chatController.fetchTotalVisitors);

module.exports = router;
