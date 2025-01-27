const Chat = require("./chat.model");
const Order = require("../orders/order.model");
const mongoose = require("mongoose");
const moment = require("moment");

const getChats = async () => {
  return await Chat.find().limit(10);
};

const fetchTotalChatsByShopId = async (shopId, startDate) => {
  const getChats = async (shopId, startDate, endDate) => {
    const shopIdObject = new mongoose.Types.ObjectId(shopId);

    return await Chat.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } }, // Use desired date format
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
  };

  const calculateTrend = (currentData, previousData) => {
    const currentTotal = currentData.reduce((sum, obj) => sum + obj.count, 0);
    const previousTotal = previousData.reduce((sum, obj) => sum + obj.count, 0);
    const trend =
      previousTotal === 0
        ? 0
        : ((currentTotal - previousTotal) / previousTotal) * 100;
    return trend.toFixed(2) + "%";
  };

  const calculatePreviousRange = (start, end) => {
    const diffDays = (end - start) / (1000 * 60 * 60 * 24) + 1;
    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate());
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - diffDays + 1);
    return { previousStart, previousEnd };
  };

  const endDate = new Date();
  const start = moment(startDate, "DD-MM-YYYY").toDate();

  const { previousStart, previousEnd } = calculatePreviousRange(start, endDate);

  const currentChats = await getChats(shopId, start, endDate);

  const previousChats = await getChats(shopId, previousStart, previousEnd);

  const trend = calculateTrend(currentChats, previousChats);

  const chartData = currentChats.map((chat) => ({
    key: chat._id,
    value: chat.count,
  }));

  const response = {
    name: "Total Chats",
    value: currentChats.reduce((sum, obj) => sum + obj.count, 0),
    trend,
    chartData,
  };

  return response;
};

const fetchTotalRevenueByShopId = async (
  shopId,
  startDate,
  baseCurrency = "USD"
) => {
  const getRevenue = async (shopId, startDate, endDate) => {
    const shopIdObject = new mongoose.Types.ObjectId(shopId);

    const orders = await Order.aggregate([
      {
        $match: {
          shopId: shopIdObject,
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $project: {
          amount: "$netPaymentSet.shopMoney.amount",
          currencyCode: "$netPaymentSet.shopMoney.currencyCode",
          createdAt: 1,
        },
      },
    ]);

    const revenueByDate = {};
    const convertedAmounts = await Promise.all(
      orders.map(async (order) => {
        const { amount, createdAt } = order;
        if (amount > 0) {
          const dateKey = moment(createdAt).format('DD-MM-YYYY');

          revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + amount;

          return amount;
        }
        return 0;
      })
    );

    return {
      revenueByDate,
      totalRevenue: convertedAmounts.reduce((sum, amount) => sum + amount, 0),
    };
  };

  const calculateTrend = (currentData, previousData) => {
    const currentTotal = currentData.totalRevenue;
    const previousTotal = previousData.totalRevenue;
    const trend =
      previousTotal === 0
        ? 0
        : ((currentTotal - previousTotal) / previousTotal) * 100;
    return trend.toFixed(2) + "%";
  };

  const calculatePreviousRange = (start, end) => {
    const diffDays = (end - start) / (1000 * 60 * 60 * 24) + 1;
    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - diffDays + 1);
    return { previousStart, previousEnd };
  };

  const endDate = new Date();
  const start = moment(startDate, "DD-MM-YYYY").toDate();

  const { previousStart, previousEnd } = calculatePreviousRange(start, endDate);

  const currentRevenue = await getRevenue(shopId, start, endDate);
  const previousRevenue = await getRevenue(shopId, previousStart, previousEnd);

  const trend = calculateTrend(currentRevenue, previousRevenue);

  const chartData = Object.keys(currentRevenue.revenueByDate).map((date) => ({
    key: date,
    value: currentRevenue.revenueByDate[date],
  }));

  const response = {
    name: "Total Revenue",
    value: currentRevenue.totalRevenue.toFixed(2),
    trend,
    chartData,
  };

  return response;
};


module.exports = {
  getChats,
  fetchTotalChatsByShopId,
  fetchTotalRevenueByShopId,
};
