const chatService = require('./chat.service');
const ShopModel  = require('../shops/shop.model')
const ChatModel   = require('./chat.model')

const getChats = async (req, res) => {
  try {
    const chats = await chatService.getChats();
    res.status(200).json(chats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getEngagedChats = async (req, res) => {
  try {
    const shopId = req.headers['shopId'];
    const customTime = req.headers['customTime'];

    let filterDate = new Date();

    if (customTime) {
      // Parse customTime (assuming it's a string representing a time interval like '7d' for 7 days)
      const timeUnits = { 'd': 'days', 'h': 'hours', 'm': 'minutes' };
      const [value, unit] = customTime.match(/(\d+)([dhms])/);
      const interval = parseInt(value);
      filterDate.setDate(filterDate.getDate() - interval);
    } else {
      filterDate.setDate(filterDate.getDate() - 7); // Default to 7 days ago
    }

    const query = {
      createdAt: { $gte: filterDate },
      "messages.role": "user",
    };

    if (shopId) {
      query.shopId = shopId;
    }

    const chats = await ChatModel.find(query).lean();

    const enhancedChats = await Promise.all(
      chats.map(async (chat) => {
        const shop = await ShopModel.findById(chat.shopId);
        return {
          ...chat,
          shopName: shop?.shopName,
          publicName: shop?.shopInformation?.publicName,
        };
      })
    );

    res.status(200).json(enhancedChats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const percentEngagedChats = async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);

    const timeSeriesData = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);

      const [engagedChatsCount, totalChatsCount] = await Promise.all([
        ChatModel.countDocuments({
          createdAt: { $gte: d, $lt: nextDay },
          "messages.role": "user",
        }),
        ChatModel.countDocuments({
          createdAt: { $gte: d, $lt: nextDay },
        }),
      ]);

      const percentEngagedChats =
        totalChatsCount > 0 ? (engagedChatsCount / totalChatsCount) * 100 : 0;
      const dateStr = d.toISOString().split("T")[0];

      timeSeriesData.push({ date: dateStr, value: percentEngagedChats });
    }

    res.json(timeSeriesData); 
  } catch (error) {
    console.error('Error fetching percent engaged chats:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}






module.exports = { getChats, getEngagedChats,percentEngagedChats };