const express = require('express');
const chatController = require('./chat.controller');

const router = express.Router();

router.get('/', chatController.getChats);

module.exports = router;
