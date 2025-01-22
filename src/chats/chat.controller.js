const chatService = require('./chat.service');

const getChats = async (req, res) => {
  try {
    const chats = await chatService.getChats();
    res.status(200).json(chats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getChats };
