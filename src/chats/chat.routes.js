const express = require('express');
const chatController = require('./chat.controller');

const router = express.Router();

router.get('/', chatController.getChats);
router.get('/user-messages-time-series',chatController.fetchTotalUserMessagesTimeSeries)
router.get('/user-messages-perchat',chatController.fetchUserMessagesPerChat)
router.get('/engaged-chats-time-series',chatController.fetchEngagedChatsTimeSeries)
router.get('/chat-duration-time-series',chatController.fetchTotalChatDurationTimeSeries)

module.exports = router;
