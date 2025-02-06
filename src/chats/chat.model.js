const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// MoneyV2 schema to represent currency and amount
const MoneyV2Schema = new Schema(
  {
    currencyCode: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false, timestamps: false }
);

// MongoDB Schema for the Chat model
const ChatSchema = new Schema(
  {
    // Reference to the Shop document this chat is associated with
    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
    },

    visitorId: {
      type: String,
    },

    // Array of messages within this chat
    messages: [
      {
        // Role of the message sender (e.g., user, assistant)
        role: { type: String, enum: ["user", "assistant"], required: true },

        // Actual content of the message
        content: { type: String, required: true },

        // Time the message was sent; defaults to current date-time
        timestamp: { type: Date, default: Date.now },

        // Optional array for product data for rendering rich product cards
        productData: {
          type: [
            {
              id: { type: String, required: true },
              imageUrls: { type: String },
              name: { type: String, required: true },
              presentmentPrice: { type: MoneyV2Schema, required: true },
              price: { type: Number }, // LEGACY (todo: remove) price
              detailsPageUrl: { type: String, required: true },
              _id: false, // Disabling automatic _id generation for productData
            },
          ],
          required: false,
        },

        _id: false, // Disabling automatic _id generation for messages
      },
    ],

    // New field for tracking product clicks
    productClicks: [
      {
        // Product ID from Shopify
        productId: { type: String, required: true },

        // The exact URL the user clicked
        detailsPageUrl: { type: String, required: true },

        // Product name for reporting and potential fallback matching
        productName: { type: String, required: true },

        // Product price at the time of click for reporting
        productPresentmentPrice: { type: MoneyV2Schema, required: true },

        // LEGACY (todo: remove) price (for legacy reasons, assumed to be in same currency as shop)
        productPrice: { type: Number },

        // Count of how many times the product was clicked
        clickCount: { type: Number, default: 1 },

        // Time the product was last clicked; defaults to current date-time
        lastClickedAt: { type: Date, default: Date.now },

        _id: false, // Disabling automatic _id generation for productClicks
      },
    ],

    // Status of the chat; either "open" or "closed"
    status: {
      type: String,
      enum: ["open", "closed", "fresh"],
      default: "open",
    }, // Updated to include "fresh"

    // Timestamps for record-keeping
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // Session locale info
    localizationSettings: {
      locale: { type: String },
      country: { type: String },
      currency: { type: String },
      currencyRate: { type: String },
    },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model("chats", ChatSchema);
