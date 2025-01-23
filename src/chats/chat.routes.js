const express = require('express');
const chatController = require('./chat.controller');

const router = express.Router();

router.get('/', chatController.getChats);
router.get('/engagedChats', chatController.getEngagedChats);
router.get('/percentageEngagedChats', chatController.percentEngagedChats);

module.exports = router;
