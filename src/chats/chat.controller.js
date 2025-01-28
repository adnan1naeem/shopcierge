const mongoose = require("mongoose"); 
const chatService = require("./chat.service");
const OrderModel = require("../orders/order.model");
const chatModel = require('./chat.model')


const getChats = async (req, res) => {
  try {
    const chats = await chatService.getChats();
    res.status(200).json(chats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getTotalChatsByShopId = async (req, res) => {
  try {
    const { shopId, startDate } = req.query;

    if (!shopId) {
      return res
        .status(400)
        .json({ message: "Missing required parameter: shopId" });
    }
    if (!startDate) {
      return res
        .status(400)
        .json({ message: "Missing required parameter: startDate" });
    }

    const chats = await chatService.fetchTotalChatsByShopId(shopId, startDate);

    res.status(200).json(chats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const fetchTotalRevenueByShopId = async (req, res) => {
  try {
    const { shopId, startDate } = req.query;

    if (!shopId) {
      return res
        .status(400)
        .json({ message: "Missing required parameter: shopId" });
    }
    if (!startDate) {
      return res
        .status(400)
        .json({ message: "Missing required parameter: startDate" });
    }

    const response = await chatService.fetchTotalRevenueByShopId(
      shopId,
      startDate
    );

    res.status(200).json(response);
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

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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
              $filter: {
                input: "$messages",
                as: "msg",
                cond: { $eq: ["$$msg.role", "user"] },
              },
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
              $filter: {
                input: "$messages",
                as: "msg",
                cond: { $eq: ["$$msg.role", "user"] },
              },
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

    // Calculate total user messages for both periods
    const firstPeriodTotalMessages = firstPeriodChats.reduce(
      (sum, chat) => sum + chat.value,
      0
    );
    const secondPeriodTotalMessages = secondPeriodChats.reduce(
      (sum, chat) => sum + chat.value,
      0
    );

    console.log(firstPeriodTotalMessages, "firstPeriodTotalMessages");
    console.log(secondPeriodTotalMessages, "secondPeriodTotalMessages");

    // Calculate trend percentage based on total user messages
    const trendPercentage =
      ((secondPeriodTotalMessages - firstPeriodTotalMessages) /
        secondPeriodTotalMessages) *
      100;
    console.log(trendPercentage, "trendPercentage");

    // Prepare chart data for response
    const chartData = secondPeriodChats.map(({ key, value }) => ({
      key,
      value,
    }));

    return res.status(200).json({
      category: "Interaction",
      name: "Total User Messages",
      value: secondPeriodTotalMessages,
      trend: trendPercentage.toFixed(2), // Add trend percentage
      chartData: secondPeriodChats,
    });
  } catch (error) {
    console.error("Error calculating chat statistics:", error);
    return res
      .status(500)
      .json({ error: "Failed to calculate chat statistics" });
  }
};

const fetchUserMessagesPerChat = async (req, res) => {
  try {
    const { shopId, startDate } = req.query;

    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const shopIdObject = new mongoose.Types.ObjectId(shopId);

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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
              $filter: {
                input: "$messages",
                as: "msg",
                cond: { $eq: ["$$msg.role", "user"] },
              },
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
              $filter: {
                input: "$messages",
                as: "msg",
                cond: { $eq: ["$$msg.role", "user"] },
              },
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

    // Calculate averages for both periods
    const firstPeriodAvg =
      firstPeriodChats.reduce((sum, chat) => sum + chat.value, 0) /
      firstPeriodChats.length;
    const secondPeriodAvg =
      secondPeriodChats.reduce((sum, chat) => sum + chat.value, 0) /
      secondPeriodChats.length;

    // Calculate the trend percentage between the two periods
    const trendPercentage =
      ((firstPeriodAvg - secondPeriodAvg) / firstPeriodAvg) * 100;

    // Calculate overall averages for the current period (last 7 days)
    const totalChats = secondPeriodChats.reduce(
      (sum, chat) => sum + chat.totalChats,
      0
    );
    const totalUserMessages = secondPeriodChats.reduce(
      (sum, chat) => sum + chat.totalUserMessages,
      0
    );
    const overallAverage = totalChats > 0 ? totalUserMessages / totalChats : 0;

    return res.status(200).json({
      category: "Interaction",
      name: "User Messages per Chat",
      value: overallAverage.toFixed(2),
      trend: trendPercentage.toFixed(2), // Add trend percentage
      chartData: secondPeriodChats.map(({ key, value }) => ({ key, value })),
    });
  } catch (error) {
    console.error("Error calculating chat statistics:", error);
    return res
      .status(500)
      .json({ error: "Failed to calculate chat statistics" });
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
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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

    const firstPeriodTotalEngagedChats = firstPeriodEngagedChats.reduce(
      (sum, chat) => sum + chat.count,
      0
    );
    console.log(firstPeriodTotalEngagedChats, "firstPeriodTotalEngagedChats");
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
      const chatData = secondPeriodEngagedChats.find(
        (chat) => chat.key === dateStr
      );
      const value = chatData ? chatData.value : 0;
    
      // Only add to timeSeries if the value is not 0
      if (value !== 0) {
        timeSeries.push({
          key: dateStr,
          value,
        });
      }
    }

    // Calculate the total number of engaged chats for the current period
    const secondPeriodTotalEngagedChats = timeSeries.reduce(
      (sum, dataPoint) => sum + dataPoint.value,
      0
    );

    // Calculate trend percentage
    const trendPercentage =
      firstPeriodTotalEngagedChats === 0
        ? secondPeriodTotalEngagedChats > 0
          ? 100
          : 0
        : ((secondPeriodTotalEngagedChats - firstPeriodTotalEngagedChats) /
            firstPeriodTotalEngagedChats) *
          100;

    // Prepare response
    return res.status(200).json({
      category: "Interaction",
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

const fetchTotalChatDurationTimeSeries = async (req, res) => {
  try {
    const { shopId, startDate } = req.query;

    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const shopIdObject = new mongoose.Types.ObjectId(shopId);

    // Parse and set date range
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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
    const firstPeriodResults = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: firstPeriodStart, $lte: firstPeriodEnd },
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          duration: { $subtract: ["$updatedAt", "$createdAt"] },
        },
      },
      {
        $group: {
          _id: "$date",
          totalDurationMs: { $sum: "$duration" },
        },
      },
    ]);

    const firstPeriodTotalDurationSeconds = firstPeriodResults.reduce(
      (sum, dataPoint) => sum + Math.round(dataPoint.totalDurationMs / 1000),
      0
    );

    // Aggregation for the second period (current period)
    const secondPeriodResults = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          duration: { $subtract: ["$updatedAt", "$createdAt"] },
        },
      },
      {
        $group: {
          _id: "$date",
          totalDurationMs: { $sum: "$duration" },
        },
      },
      {
        $project: {
          key: "$_id",
          totalSeconds: { $divide: ["$totalDurationMs", 1000] },
          minutes: { $floor: { $divide: ["$totalDurationMs", 60000] } },
          seconds: {
            $mod: [{ $divide: ["$totalDurationMs", 1000] }, 60],
          },
          _id: 0,
        },
      },
      { $sort: { key: 1 } },
    ]);

    // Generate time series data for the second period in minutes:seconds format
    let timeSeries = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const chatData = secondPeriodResults.find((data) => data.key === dateStr);
      const value = chatData
        ? `${chatData.minutes}:${String(
            Math.round(chatData.seconds)
          ).padStart(2, "0")}`
        : "0:00";
    
      // Only add to timeSeries if the value is not "0:00"
      if (value !== "0:00") {
        timeSeries.push({
          key: dateStr,
          value,
        });
      }
    }

    // Calculate the total duration in seconds for the second period
    const secondPeriodTotalDurationSeconds = secondPeriodResults.reduce(
      (sum, dataPoint) => sum + dataPoint.totalSeconds,
      0
    );

    // Calculate the trend percentage
    const trendPercentage =
      firstPeriodTotalDurationSeconds === 0
        ? secondPeriodTotalDurationSeconds > 0
          ? 100
          : 0
        : ((secondPeriodTotalDurationSeconds -
            firstPeriodTotalDurationSeconds) /
            firstPeriodTotalDurationSeconds) *
          100;

    // Format total duration as minutes:seconds
    const totalMinutes = Math.floor(secondPeriodTotalDurationSeconds / 60);
    const totalSeconds = Math.round(secondPeriodTotalDurationSeconds % 60);
    const totalDurationFormatted = `${totalMinutes}:${String(
      totalSeconds
    ).padStart(2, "0")}`;

    // Prepare the response
    return res.status(200).json({
      category: "Total Duration (Engaged Chats)",
      name: "Total Chat Duration",
      value: totalDurationFormatted,
      trend: trendPercentage.toFixed(2),
      chartData: timeSeries,
    });
  } catch (error) {
    console.error("Error calculating total chat duration:", error);
    return res
      .status(500)
      .json({ error: "Failed to calculate total chat duration" });
  }
};

const fetchRecommendedProductsCount = async (req, res) => {
  // This function calculates the total number of recommended products for
  // a shop during a specified period (or the last 7 days by default), excluding any days with zero recommended products.
  //  It compares this data to the same period in the previous timeframe, calculates the percentage change (trend),
  //   and returns the total recommended products, the trend, and daily counts in a chart format,
  //  with zero values excluded. This ensures that the chart only reflects meaningful data points.

  try {
    const { shopId, startDate } = req.query;

    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const shopIdObject = new mongoose.Types.ObjectId(shopId);

    // If startDate is provided, use it; otherwise, default to 7 days ago
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = new Date();
    start.setHours(0, 0, 0, 0); // Set start to the beginning of the day
    end.setHours(23, 59, 59, 999); // Set end to the end of the current day

    // Calculate the duration of the period (in days) to determine the previous period
    const durationInDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Calculate the previous period's start and end dates
    const prevStart = new Date(start);
    const prevEnd = new Date(end);
    prevStart.setDate(prevStart.getDate() - durationInDays);
    prevEnd.setDate(prevEnd.getDate() - durationInDays);

    // Aggregate chat data to count recommended products for the current period
    const recommendedProductsData = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $unwind: "$messages",
      },
      {
        $match: {
          "messages.role": "assistant",
          "messages.productData": { $exists: true, $ne: [] },
        },
      },
      {
        $project: {
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$messages.timestamp" },
          },
          recommendedProductsCount: { $size: "$messages.productData" },
        },
      },
      {
        $group: {
          _id: "$date",
          totalRecommendedProducts: { $sum: "$recommendedProductsCount" },
        },
      },
      // Exclude records with totalRecommendedProducts equal to 0
      {
        $match: {
          totalRecommendedProducts: { $gt: 0 },
        },
      },
      {
        $project: {
          key: "$_id",
          value: "$totalRecommendedProducts",
          _id: 0,
        },
      },
      { $sort: { key: 1 } },
    ]);

    // Filter out any data points that fall outside the given range
    const timeSeries = recommendedProductsData.filter((dataPoint) => {
      const date = new Date(dataPoint.key);
      return date >= start && date <= end;
    });

    // Calculate the total number of recommended products in the current period
    const totalRecommendedProducts = timeSeries.reduce(
      (sum, dataPoint) => sum + dataPoint.value,
      0
    );

    // Aggregate chat data for the previous period (same length as current period)
    const prevPeriodData = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: prevStart, $lte: prevEnd },
        },
      },
      {
        $unwind: "$messages",
      },
      {
        $match: {
          "messages.role": "assistant",
          "messages.productData": { $exists: true, $ne: [] },
        },
      },
      {
        $project: {
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$messages.timestamp" },
          },
          recommendedProductsCount: { $size: "$messages.productData" },
        },
      },
      {
        $group: {
          _id: "$date",
          totalRecommendedProducts: { $sum: "$recommendedProductsCount" },
        },
      },
      // Exclude records with totalRecommendedProducts equal to 0
      {
        $match: {
          totalRecommendedProducts: { $gt: 0 },
        },
      },
      {
        $project: {
          key: "$_id",
          value: "$totalRecommendedProducts",
          _id: 0,
        },
      },
      { $sort: { key: 1 } },
    ]);

    // Filter out the previous period's data based on the range
    const prevPeriodTimeSeries = prevPeriodData.filter((dataPoint) => {
      const date = new Date(dataPoint.key);
      return date >= prevStart && date <= prevEnd;
    });

    // Calculate the total number of recommended products in the previous period
    const totalRecommendedProductsPrevPeriod = prevPeriodTimeSeries.reduce(
      (sum, dataPoint) => sum + dataPoint.value,
      0
    );

    // Calculate the percentage change (trend) between the current and previous periods
    let trend = 0;
    if (totalRecommendedProductsPrevPeriod > 0) {
      trend =
        ((totalRecommendedProducts - totalRecommendedProductsPrevPeriod) /
          totalRecommendedProductsPrevPeriod) *
        100;
    }

    // Determine the trend description (+ or -)
    const trendDescription =
      trend > 0 ? `+${trend.toFixed(2)}%` : `${trend.toFixed(2)}%`;

    return res.status(200).json({
      category: "Sales",
      name: "Recommended Products",
      value: totalRecommendedProducts,
      trend: trendDescription,
      chartData: timeSeries,
    });
  } catch (error) {
    console.error("Error calculating recommended products:", error);
    return res
      .status(500)
      .json({ error: "Failed to calculate recommended products" });
  }
};

const fetchClickedProductsCount = async (req, res) => {
  //  Function Summary:
  // This function calculates the total number of product clicks during a given time period
  //  (either custom or the last 7 days by default). It then compares the total clicks of
  //  the current period with the previous same-length period to determine the
  //  trend (increase or decrease in percentage). The result is a summary of product
  //   clicks, with the total count, trend percentage (e.g., +10% or -5%),
  //  and a list of days with actual clicks. Days with zero clicks are excluded from the chart data.
  try {
    const { shopId, startDate } = req.query;

    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const shopIdObject = new mongoose.Types.ObjectId(shopId);

    // Set the date range (custom or last 7 days by default)
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Aggregate product click data for the given date range
    const clickedProductsData = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $unwind: "$productClicks",
      },
      {
        $match: {
          "productClicks.lastClickedAt": { $gte: start, $lte: end },
        },
      },
      {
        $project: {
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$productClicks.lastClickedAt",
            },
          },
          clickCount: "$productClicks.clickCount",
        },
      },
      {
        $group: {
          _id: "$date",
          totalClicks: { $sum: "$clickCount" },
        },
      },
      {
        $project: {
          key: "$_id",
          value: "$totalClicks",
          _id: 0,
        },
      },
      { $sort: { key: 1 } },
    ]);

    // Generate a time series for the entire period
    let timeSeries = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dataPoint = clickedProductsData.find(
        (item) => item.key === dateStr
      );

      timeSeries.push({
        key: dateStr,
        value: dataPoint ? dataPoint.value : 0,
      });
    }

    // Calculate the total number of clicks
    const totalClicks = timeSeries.reduce(
      (sum, dataPoint) => sum + dataPoint.value,
      0
    );

    // Calculate trend: compare with previous period (same length as the current one)
    const trendPeriod = timeSeries.length;
    const prevPeriodData = timeSeries.slice(0, trendPeriod);
    const prevPeriodTotal = prevPeriodData.reduce(
      (sum, dataPoint) => sum + dataPoint.value,
      0
    );
    let trend = 0;
    if (prevPeriodTotal > 0) {
      trend = ((totalClicks - prevPeriodTotal) / prevPeriodTotal) * 100;
    }

    return res.status(200).json({
      category: "Sales",
      name: "Product Clicks",
      value: totalClicks,
      trend: `${trend.toFixed(2)}%`,
      chartData: timeSeries.filter((item) => item.value > 0), // Only include dates with clicks
    });
  } catch (error) {
    console.error("Error calculating product clicks:", error);
    return res
      .status(500)
      .json({ error: "Failed to calculate product clicks" });
  }
};

const fetchAvgChatDurationTimeSeries = async (req, res) => {
  try {
    const { shopId, startDate } = req.query;

    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const shopIdObject = new mongoose.Types.ObjectId(shopId);

    // Parse and set date range
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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
    const firstPeriodResults = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: firstPeriodStart, $lte: firstPeriodEnd },
        },
      },
      {
        $group: {
          _id: null,
          avgDurationMs: { $avg: { $subtract: ["$updatedAt", "$createdAt"] } },
        },
      },
    ]);

    const firstPeriodAvgDurationSeconds =
      firstPeriodResults.length > 0
        ? Math.round(firstPeriodResults[0].avgDurationMs / 1000)
        : 0;

    // Aggregation for the second period (current period)
    const secondPeriodResults = await chatModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          avgDurationMs: { $avg: { $subtract: ["$updatedAt", "$createdAt"] } },
        },
      },
      {
        $project: {
          key: "$_id",
          avgSeconds: { $divide: ["$avgDurationMs", 1000] },
          minutes: { $floor: { $divide: ["$avgDurationMs", 60000] } },
          seconds: {
            $mod: [{ $divide: ["$avgDurationMs", 1000] }, 60],
          },
          _id: 0,
        },
      },
      { $sort: { key: 1 } },
    ]);

    // Generate time series data for the second period in minutes:seconds format
    let timeSeries = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const chatData = secondPeriodResults.find((data) => data.key === dateStr);
      const value = chatData
        ? `${chatData.minutes}:${String(
            Math.round(chatData.seconds)
          ).padStart(2, "0")}`
        : "0:00";
    
      if (value !== "0:00") {
        timeSeries.push({
          key: dateStr,
          value,
        });
      }
    }

    // Calculate the average duration in seconds for the second period
    const secondPeriodAvgDurationSeconds =
      secondPeriodResults.length > 0
        ? secondPeriodResults.reduce(
            (sum, dataPoint) => sum + dataPoint.avgSeconds,
            0
          ) / secondPeriodResults.length
        : 0;

    // Calculate the trend percentage
    const trendPercentage =
      firstPeriodAvgDurationSeconds === 0
        ? secondPeriodAvgDurationSeconds > 0
          ? 100
          : 0
        : ((secondPeriodAvgDurationSeconds - firstPeriodAvgDurationSeconds) /
            firstPeriodAvgDurationSeconds) *
          100;

    // Format average duration as minutes:seconds
    const avgMinutes = Math.floor(secondPeriodAvgDurationSeconds / 60);
    const avgSeconds = Math.round(secondPeriodAvgDurationSeconds % 60);
    const avgDurationFormatted = `${avgMinutes}:${String(avgSeconds).padStart(
      2,
      "0"
    )}`;

    // Prepare the response
    return res.status(200).json({
      category: "Average Duration (Engaged Chats)",
      name: "Average Chat Duration",
      value: avgDurationFormatted,
      trend: trendPercentage.toFixed(2),
      chartData: timeSeries,
    });
  } catch (error) {
    console.error("Error calculating average chat duration:", error);
    return res
      .status(500)
      .json({ error: "Failed to calculate average chat duration" });
  }
};

const fetchTotalChatsWithUserProduct = async (req, res) => {
  try {
    const { shopId, startDate } = req.query;

    // Validate shopId
    if (!shopId) {
      return res.status(400).json({ error: "shopId is required" });
    }

    const shopIdObject = new mongoose.Types.ObjectId(shopId);

    // Parse and set date range
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
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
    const firstPeriodResults = await OrderModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: firstPeriodStart, $lte: firstPeriodEnd },
          "shopciergeAttribution.chatId": { $exists: true },
          "shopciergeAttribution.attributedProductIds.0": { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          value: { $sum: 1 }, // Count total chats
        },
      },
    ]);

    const firstPeriodTotalChats =
      firstPeriodResults.length > 0 ? firstPeriodResults[0].value : 0;

    // Aggregation for the second period (current period)
    const secondPeriodResults = await OrderModel.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: start, $lte: end },
          "shopciergeAttribution.chatId": { $exists: true },
          "shopciergeAttribution.attributedProductIds.0": { $exists: true },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          value: { $sum: 1 }, // Count total chats per day
        },
      },
      {
        $project: {
          key: "$_id",
          value: 1,
          _id: 0,
        },
      },
      { $sort: { key: 1 } },
    ]);
    const secondPeriodTotalChats = secondPeriodResults.reduce(
      (sum, dataPoint) => sum + dataPoint.value,
      0
    );

    // Calculate the trend percentage
    const trendPercentage =
      firstPeriodTotalChats === 0
        ? secondPeriodTotalChats > 0
          ? 100
          : 0
        : ((secondPeriodTotalChats - firstPeriodTotalChats) /
            firstPeriodTotalChats) *
          100;

    // Prepare the response
    return res.status(200).json({
      category: "Total Chats with Product Purchase",
      name: "Total Chats",
      value: secondPeriodTotalChats,
      trend: trendPercentage.toFixed(2),
      chartData: secondPeriodResults,
    });
  } catch (error) {
    console.error("Error calculating total chats with product purchase:", error);
    return res
      .status(500)
      .json({ error: "Failed to calculate total chats with product purchase" });
  }
};




module.exports = {
  getChats,
  getTotalChatsByShopId,
  fetchTotalRevenueByShopId,
  fetchTotalUserMessagesTimeSeries,
  fetchUserMessagesPerChat,
  fetchEngagedChatsTimeSeries,
  fetchTotalChatDurationTimeSeries,
  fetchRecommendedProductsCount,
  fetchClickedProductsCount,
  fetchAvgChatDurationTimeSeries,
  fetchTotalChatsWithUserProduct
};
