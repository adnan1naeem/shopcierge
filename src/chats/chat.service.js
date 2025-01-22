const Chat = require('./chat.model');

const getChats = async () => {
  return await Chat.find().limit(10);
};

module.exports = { getChats };
