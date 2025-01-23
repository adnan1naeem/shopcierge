const mongoose = require("mongoose"); 
const chatService = require('./chat.service');
const chatModel = require('./chat.model')

const getChats = async (req, res) => {
  try {
    const chats = await chatService.getChats();
    res.status(200).json(chats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const fetchTotalUserMessagesTimeSeries = async (req, res) => {
  try {
    const { shopId, startDate: customStartDate } = req.query;

    // Calculate start date 
    let startDate;
    let prevStartDate;
    const endDate = new Date();

    if (customStartDate) {
      startDate = new Date(customStartDate);
      prevStartDate = new Date(startDate); 
      prevStartDate.setDate(prevStartDate.getDate() - (startDate - prevStartDate) / (1000 * 60 * 60 * 24)); 
    } else {
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 7); 
      prevStartDate = new Date();
      prevStartDate.setDate(endDate.getDate() - 14); 
    }

    const timeSeriesData = [];
    let totalUserMessages = 0;
    let prevTotalUserMessages = 0;
    const shopIdObject = new mongoose.Types.ObjectId(shopId);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);

      const result = await chatModel.aggregate([
        {
          $match: {
            shopId: shopIdObject, 
            createdAt: { $gte: d, $lt: nextDay },
          },
        },
        {
          $project: {
            userMessages: { $size: { $filter: { input: "$messages", as: "msg", cond: { $eq: ["$$msg.role", "user"] } } } },
          },
        },
        {
          $group: {
            _id: null,
            totalUserMessages: { $sum: "$userMessages" },
          },
        },
      ]);

      const dailyUserMessages = result.length > 0 ? result[0].totalUserMessages : 0; 
      totalUserMessages += dailyUserMessages; 

      const dateStr = d.toISOString().split("T")[0];

      timeSeriesData.push({ key: dateStr, value: dailyUserMessages });
    }

    // Calculate previous period
    for (let d = new Date(prevStartDate); d <= new Date(startDate); d.setDate(d.getDate() + 1)) {
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);

      const result = await chatModel.aggregate([
        {
          $match: {
            shopId: shopIdObject, 
            createdAt: { $gte: d, $lt: nextDay },
          },
        },
        {
          $project: {
            userMessages: { $size: { $filter: { input: "$messages", as: "msg", cond: { $eq: ["$$msg.role", "user"] } } } },
          },
        },
        {
          $group: {
            _id: null,
            totalUserMessages: { $sum: "$userMessages" },
          },
        },
      ]);

      const dailyUserMessages = result.length > 0 ? result[0].totalUserMessages : 0; 
      prevTotalUserMessages += dailyUserMessages; 
    }

    // Calculate trend percentage
    let trendPercentage = 0;
    console.log(prevTotalUserMessages, 'prevTotalUserMessages');
    if (prevTotalUserMessages > 0) {
      trendPercentage = ((totalUserMessages - prevTotalUserMessages) / prevTotalUserMessages) * 100;
    }


    res.status(200).json({totalUserMessages, trendPercentage, timeSeriesData }); 
  } catch (error) {
    console.error("Error fetching time series data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getChats,fetchTotalUserMessagesTimeSeries };
