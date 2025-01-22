const mongoose = require('mongoose');
const { Schema } = mongoose;
const { BillingInterval } = require("@shopify/shopify-api");

// Constants for shop platform types and categories
const SHOP_PLATFORM_TYPES = [
  "Shopify",
  "WooCommerce",
  "NetSuite",
  "Magento",
  "BigCommerce",
  "SquareSpace",
  "Wix",
  "PrestaShop",
  "3dcart",
  "OpenCart",
  "Lightspeed",
  "Ecwid",
  "Neto",
  "Custom",
];

const SHOP_CATEGORIES = [
  "Apparel & Accessories",
  "Automotive",
  "Baby & Toddler",
  "Business & Industrial",
  "Cameras & Optics",
  "Electronics",
  "Food, Beverages & Tobacco",
  "Furniture",
  "Hardware",
  "Health & Beauty",
  "Home & Garden",
  "Luggage & Bags",
  "Media",
  "Office Supplies",
  "Software",
  "Sporting Goods",
  "Toys & Games",
  "Others",
];

// Chat button position enum adjusted for require mode
const ChatButtonPosition = {
  BottomRight: "bottom-right",
  BottomLeft: "bottom-left",
};

// Get the max char limit for Custom Information (merchant customization field)
const configCustomInfoCharLimit = Number(
  process.env.NEXT_PUBLIC_CUSTOM_INFO_CHAR_LIMIT
);
if (isNaN(configCustomInfoCharLimit) || configCustomInfoCharLimit <= 0) {
  throw new Error("NEXT_PUBLIC_CUSTOM_INFO_CHAR_LIMIT is not a valid number");
}

// Get the max char limit for the Custom Behavior (merchant customization field)
const configCustomBehaviorCharLimit = Number(
  process.env.NEXT_PUBLIC_CUSTOM_BEHAVIOR_CHAR_LIMIT
);
if (
  isNaN(configCustomBehaviorCharLimit) ||
  configCustomBehaviorCharLimit <= 0
) {
  throw new Error(
    "NEXT_PUBLIC_CUSTOM_BEHAVIOR_CHAR_LIMIT is not a valid number"
  );
}

// Utility helper function
function arrayLimit(val) {
  return val.length === 2;
}

// Define CustomColors schema
const CustomColorsSchema = new Schema(
  {
    pageBackgroundColor: { type: String, match: /^#[0-9A-Fa-f]{6}$/ },
    botMessageBackgroundColor: { type: String, match: /^#[0-9A-Fa-f]{6}$/ },
    botMessageTextColor: { type: String, match: /^#[0-9A-Fa-f]{6}$/ },
    userMessageBackgroundColor: { type: String, match: /^#[0-9A-Fa-f]{6}$/ },
    userMessageTextColor: { type: String, match: /^#[0-9A-Fa-f]{6}$/ },
  },
  { _id: false }
);

// Define CustomFonts schema
const CustomFontsSchema = new Schema(
  {
    headingFont: { type: String },
    bodyFont: { type: String },
  },
  { _id: false }
);

// Define Mongoose schemas for complex nested objects
const ColorSchema = new Schema(
  {
    background: { type: String },
    foreground: { type: String },
  },
  { _id: false }
);

const ImageSchema = new Schema(
  {
    id: { type: String },
    alt: { type: String },
    url: { type: String },
  },
  { _id: false }
);

const BrandColorSchema = new Schema(
  {
    primary: ColorSchema,
    secondary: ColorSchema,
  },
  { _id: false }
);

const BrandingSchema = new Schema(
  {
    logo: ImageSchema,
    coverImage: ImageSchema,
    squareLogo: ImageSchema,
    colors: BrandColorSchema,
  },
  { _id: false }
);

// Define BillingInfo Schema
const BillingInfoSchema = new Schema(
  {
    id: { type: String },
    planName: { type: String },
    planAmount: { type: Number },
    planInterval: { type: String, enum: Object.values(BillingInterval) },
    test: { type: Boolean },
    commissionRate: { type: Number },
  },
  { _id: false }
);

// Define MultilingualWelcomeMessageSchema
const MultilingualWelcomeMessageSchema = new Schema(
  {
    message: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

// Define ShopSchema with the above
const ShopSchema = new Schema(
  {
    shopName: { type: String, required: true, unique: true, immutable: true },
    platform: {
      type: String,
      required: true,
      enum: SHOP_PLATFORM_TYPES,
    },
    branding: BrandingSchema,
    botConfiguration: {
      isBotEnabled: { type: Boolean, default: true },
      isWidgetEmbedded: { type: Boolean },
      customInformation: { type: String, maxlength: configCustomInfoCharLimit },
      customBehavior: {
        type: String,
        maxlength: configCustomBehaviorCharLimit,
      },
      customColors: CustomColorsSchema,
      customFonts: CustomFontsSchema,
      customBotName: { type: String, maxlength: 50 },
      customWelcomeMessage: { type: String, maxlength: 250 },
      customChatStarterOptions: [{ type: String, maxlength: 200 }],
      pregenWelcomeMessages: {
        type: Map,
        of: MultilingualWelcomeMessageSchema,
        default: {},
      },
      chatButtonPosition: {
        type: String,
        enum: Object.values(ChatButtonPosition),
        default: ChatButtonPosition.BottomRight,
      },
    },
    shopInformation: {
      publicName: { type: String },
      shortDescription: { type: String },
      slogan: { type: String },
      category: { type: String, enum: SHOP_CATEGORIES },
      description: { type: String },
      supportEmail: { type: String },
      planName: { type: String },
      defaultLanguage: { type: String },
      defaultCountry: { type: String },
      shopCurrency: { type: String },
    },
    productIndex: {
      lastDataHash: { type: String },
      pineconeIndexNamespace: { type: String },
      productsSynced: {
        numberSynced: { type: Number },
        total: { type: Number },
      },
      lastDataTime: { type: Date },
    },
    auth: {
      session: [
        {
          type: [
            {
              type: Schema.Types.Mixed,
              required: true,
              validate: {
                validator: (v) =>
                  ["string", "number", "boolean"].includes(typeof v),
                message: (props) =>
                  `${props.value} is not a valid session value!`,
              },
            },
          ],
          validate: [arrayLimit, "{PATH} exceeds the limit of 2"],
        },
      ],
    },
    billing: BillingInfoSchema,
    website: {
      combinedMarkdownText: { type: String },
      lastDataTime: { type: Date },
      pagesSynced: { type: Number },
      hash: { type: String },
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

module.exports = mongoose.model('shops', ShopSchema);
