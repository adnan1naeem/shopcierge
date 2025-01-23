const express = require('express');
const chatController = require('./chat.controller');

const router = express.Router();

router.get('/', chatController.getChats);
router.get('/user-messages-time-series',chatController.fetchTotalUserMessagesTimeSeries)

module.exports = router;
