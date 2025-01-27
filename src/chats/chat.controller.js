const mongoose = require("mongoose");
const chatService = require("./chat.service");
const chatModel = require("./chat.model");

const getChats = async (req, res) => {
  try {
    const chats = await chatService.getChats();
    res.status(200).json(chats);
  } catch (error) {
    res.status(400).json({ message: error.message });
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

module.exports = {
  getChats,
  fetchRecommendedProductsCount,
  fetchClickedProductsCount,
};
