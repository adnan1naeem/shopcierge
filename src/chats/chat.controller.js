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
    const { shopId, startDate } = req.query;

    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const shopIdObject = new mongoose.Types.ObjectId(shopId);

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = new Date(); // Current date

    start.setHours(0, 0, 0, 0);

    const currentDate = new Date();
    const diffInTime = currentDate.getTime() - start.getTime();

    const firstPeriodStart = new Date(start.getTime() - diffInTime); 
    const firstPeriodEnd = new Date(start.getTime());

    firstPeriodStart.setHours(0, 0, 0, 0);
    firstPeriodEnd.setHours(23, 59, 59, 999); 

    // Aggregate data for the first period (previous period)
    const firstPeriodChats = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: firstPeriodStart, $lt: firstPeriodEnd },
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalMessages: { $size: "$messages" },
          userMessages: {
            $size: {
              $filter: { input: "$messages", as: "msg", cond: { $eq: ["$$msg.role", "user"] } },
            },
          },
        },
      },
      {
        $group: {
          _id: "$date",
          totalUserMessages: { $sum: "$userMessages" },
        },
      },
      {
        $project: {
          key: "$_id",
          value: "$totalUserMessages",
          _id: 0,
        },
      },
      { $sort: { key: 1 } },
    ]);

    const secondPeriodStart = start;
    // Aggregate data for the second period (current 10 days)
    const secondPeriodChats = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: secondPeriodStart, $lt: end },
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalMessages: { $size: "$messages" },
          userMessages: {
            $size: {
              $filter: { input: "$messages", as: "msg", cond: { $eq: ["$$msg.role", "user"] } },
            },
          },
        },
      },
      {
        $group: {
          _id: "$date",
          totalUserMessages: { $sum: "$userMessages" },
        },
      },
      {
        $project: {
          key: "$_id",
          value: "$totalUserMessages",
          _id: 0,
        },
      },
      { $sort: { key: 1 } },
    ]);

    let timeSeries = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]; // Format as 'YYYY-MM-DD'
      const chatData = secondPeriodChats.find((chat) => chat.date === dateStr);

      timeSeries.push({
        key: dateStr,
        value: chatData ? chatData.value : 0, // Use the count or default to 0
      });
    }

    // Calculate total user messages for both periods
    const firstPeriodTotalMessages = firstPeriodChats.reduce((sum, chat) => sum + chat.value, 0);
    const secondPeriodTotalMessages = secondPeriodChats.reduce((sum, chat) => sum + chat.value, 0);

    console.log(firstPeriodTotalMessages, 'firstPeriodTotalMessages');
    console.log(secondPeriodTotalMessages, 'secondPeriodTotalMessages');
    
    // Calculate trend percentage based on total user messages
    const trendPercentage = ((secondPeriodTotalMessages - firstPeriodTotalMessages ) / secondPeriodTotalMessages) * 100;
    console.log(trendPercentage, 'trendPercentage');

    // Prepare chart data for response
    const chartData = secondPeriodChats.map(({ key, value }) => ({ key, value }));

    return res.status(200).json({
      category: 'Interaction',
      name: 'Total User Messages',
      value: secondPeriodTotalMessages,
      trend: trendPercentage.toFixed(2), // Add trend percentage
      chartData: timeSeries,
    });
  } catch (error) {
    console.error("Error calculating chat statistics:", error);
    return res.status(500).json({ error: "Failed to calculate chat statistics" });
  }
};

const fetchUserMessagesPerChat = async (req, res) => {
  try {
    const { shopId, startDate } = req.query;

    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const shopIdObject = new mongoose.Types.ObjectId(shopId);

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = new Date(); // Current date

    start.setHours(0, 0, 0, 0);

    const currentDate = new Date();
    const diffInTime = currentDate.getTime() - start.getTime();

    const firstPeriodStart = new Date(start.getTime() - diffInTime); 
    const firstPeriodEnd = new Date(start.getTime());

    firstPeriodStart.setHours(0, 0, 0, 0);
    firstPeriodEnd.setHours(23, 59, 59, 999); 

    // Aggregate data for the first period (previous period)
    const firstPeriodChats = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: firstPeriodStart, $lt: firstPeriodEnd },
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalMessages: { $size: "$messages" },
          userMessages: {
            $size: {
              $filter: { input: "$messages", as: "msg", cond: { $eq: ["$$msg.role", "user"] } },
            },
          },
        },
      },
      {
        $group: {
          _id: "$date",
          totalChats: { $sum: 1 },
          totalUserMessages: { $sum: "$userMessages" },
        },
      },
      {
        $project: {
          key: "$_id",
          value: { $divide: ["$totalUserMessages", "$totalChats"] },
          _id: 0,
          totalChats: 1,
          totalUserMessages: 1,
        },
      },
      { $sort: { key: 1 } },
    ]);

    const secondPeriodStart = start;
    // Aggregate data for the second period (current 10 days)
    const secondPeriodChats = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: secondPeriodStart, $lt: end },
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalMessages: { $size: "$messages" },
          userMessages: {
            $size: {
              $filter: { input: "$messages", as: "msg", cond: { $eq: ["$$msg.role", "user"] } },
            },
          },
        },
      },
      {
        $group: {
          _id: "$date",
          totalChats: { $sum: 1 },
          totalUserMessages: { $sum: "$userMessages" },
        },
      },
      {
        $project: {
          key: "$_id",
          value: { $divide: ["$totalUserMessages", "$totalChats"] },
          _id: 0,
          totalChats: 1,
          totalUserMessages: 1,
        },
      },
      { $sort: { key: 1 } },
    ]);

    const timeSeries = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]; // Format as 'YYYY-MM-DD'

      // Find if the date exists in secondPeriodChats
      const chatData = secondPeriodChats.find((chat) => chat.date === dateStr);

      timeSeries.push({
        key: dateStr,
        value: chatData ? chatData.value : 0, // Use the count or default to 0
        totalChats: chatData ? chatData.totalChats : 0,
        totalUserMessages: chatData ? chatData.totalUserMessages : 0,
      });
    }

    // Calculate averages for both periods
    const firstPeriodAvg = firstPeriodChats.reduce((sum, chat) => sum + chat.value, 0) / firstPeriodChats.length;
    const secondPeriodAvg = secondPeriodChats.reduce((sum, chat) => sum + chat.value, 0) / secondPeriodChats.length;

    // Calculate the trend percentage between the two periods
    const trendPercentage = ((firstPeriodAvg - secondPeriodAvg) / firstPeriodAvg) * 100;

    // Calculate overall averages for the current period (last 7 days)
    const totalChats = secondPeriodChats.reduce((sum, chat) => sum + chat.totalChats, 0);
    const totalUserMessages = secondPeriodChats.reduce((sum, chat) => sum + chat.totalUserMessages, 0);
    const overallAverage = totalChats > 0 ? totalUserMessages / totalChats : 0;

    return res.status(200).json({
      category: 'Interaction',
      name: 'User Messages per Chat',
      value: overallAverage.toFixed(2),
      trend: trendPercentage.toFixed(2), // Add trend percentage
      chartData: timeSeries.map(({ key, value }) => ({ key, value })),
    });
  } catch (error) {
    console.error("Error calculating chat statistics:", error);
    return res.status(500).json({ error: "Failed to calculate chat statistics" });
  }
};

const fetchEngagedChatsTimeSeries = async (req, res) => {
  try {
    const { shopId, startDate } = req.query;

    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const shopIdObject = new mongoose.Types.ObjectId(shopId);

    // Parse and set date range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Calculate the first period start and end dates
    const diffInTime = end.getTime() - start.getTime(); // Custom period duration
    const firstPeriodStart = new Date(start.getTime() - diffInTime);
    const firstPeriodEnd = new Date(start.getTime() - 1); // Just before the current period starts
    firstPeriodStart.setHours(0, 0, 0, 0);
    firstPeriodEnd.setHours(23, 59, 59, 999);

    // Aggregation for the first period (previous period)
    const firstPeriodEngagedChats = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: firstPeriodStart, $lte: firstPeriodEnd },
          "messages.role": "user",
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        },
      },
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 },
        },
      },
    ]);

    const firstPeriodTotalEngagedChats = firstPeriodEngagedChats.reduce((sum, chat) => sum + chat.count, 0);
    console.log(firstPeriodTotalEngagedChats ,'firstPeriodTotalEngagedChats');
    // Aggregation for the second period (current period)
    const secondPeriodEngagedChats = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: start, $lte: end },
          "messages.role": "user",
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        },
      },
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          key: "$_id",
          value: "$count",
          _id: 0,
        },
      },
      { $sort: { key: 1 } },
    ]);

    // Generate time series data
    let timeSeries = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const chatData = secondPeriodEngagedChats.find((chat) => chat.key === dateStr);
      timeSeries.push({
        key: dateStr,
        value: chatData ? chatData.value : 0,
      });
    }

    // Calculate the total number of engaged chats for the current period
    const secondPeriodTotalEngagedChats = timeSeries.reduce((sum, dataPoint) => sum + dataPoint.value, 0);

    // Calculate trend percentage
    const trendPercentage =
      firstPeriodTotalEngagedChats === 0
        ? secondPeriodTotalEngagedChats > 0
          ? 100
          : 0
        : ((secondPeriodTotalEngagedChats - firstPeriodTotalEngagedChats) / firstPeriodTotalEngagedChats) * 100;

    // Prepare response
    return res.status(200).json({
      category: 'Interaction',
      name: "Engaged Chats",
      value: secondPeriodTotalEngagedChats,
      trend: trendPercentage.toFixed(2),
      chartData: timeSeries,
    });
  } catch (error) {
    console.error("Error calculating engaged chats:", error);
    return res.status(500).json({ error: "Failed to calculate engaged chats" });
  }
};



module.exports = { getChats,fetchTotalUserMessagesTimeSeries,fetchUserMessagesPerChat,fetchEngagedChatsTimeSeries}