const mongoose = require('mongoose');
const { Schema } = mongoose;

// MoneyV2 Subschema
const MoneyV2Schema = new Schema(
  {
    amount: { type: Number, required: true },
    currencyCode: { type: String, required: true },
  },
  { _id: false }
);

// MoneyBag Subschema
const MoneyBagSchema = new Schema(
  {
    shopMoney: MoneyV2Schema,
    presentmentMoney: MoneyV2Schema,
  },
  { _id: false }
);

// UTMParameters Subschema
const UTMParametersSchema = new Schema(
  {
    source: String,
    medium: String,
    campaign: String,
    term: String,
    content: String,
  },
  { _id: false }
);

// CustomerVisit Subschema
const CustomerVisitSchema = new Schema(
  {
    id: String,
    landingPage: String,
    landingPageHtml: String,
    occurredAt: String,
    referralCode: String,
    referralInfoHtml: String,
    referrerUrl: String,
    source: String,
    sourceDescription: String,
    utmParameters: UTMParametersSchema,
  },
  { _id: false }
);

// MomentsCount Subschema
const MomentsCountSchema = new Schema(
  {
    count: { type: Number, default: 0 },
    precision: { type: String, enum: ["AT_LEAST", "EXACT"], default: "EXACT" },
  },
  { _id: false }
);

// CustomerJourneySummary Subschema
const CustomerJourneySummarySchema = new Schema(
  {
    customerOrderIndex: Number,
    daysToConversion: Number,
    firstVisit: CustomerVisitSchema,
    lastVisit: CustomerVisitSchema,
    momentsCount: MomentsCountSchema,
    ready: Boolean,
  },
  { _id: false }
);

// LineItem Subschema
const LineItemSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    quantity: { type: Number, required: true },
    product: {
      id: String,
    },
    discountedTotalSet: MoneyBagSchema,
  },
  { _id: false }
);

// UsageCharge Subschema
const UsageChargeSchema = new Schema(
  {
    id: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

// ShopCiergeAttribution Subschema
const ShopCiergeAttributionSchema = new Schema(
  {
    attributedProductIds: [
      {
        id: { type: String, required: true },
        _id: false,
      },
    ],
    sumAttributedProductPrice: { type: Number, required: true },
    commissionRate: { type: Number, required: true },
    commissionEarned: { type: Number, required: true },
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
    },
    usageCharge: UsageChargeSchema,
  },
  { _id: false }
);

// Address Subschema
const AddressSchema = new Schema(
  {
    address1: String,
    address2: String,
    city: String,
    province: String,
    zip: String,
    country: String,
    firstName: String,
    lastName: String,
    phone: String,
  },
  { _id: false }
);

// Order Schema
const OrderSchema = new Schema(
  {
    id: { type: String, required: true },
    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    customerJourneySummary: CustomerJourneySummarySchema,
    lineItems: [LineItemSchema],
    netPaymentSet: MoneyBagSchema,
    currentTotalPriceSet: MoneyBagSchema,
    sumLineItemsPrice: Number,
    shopciergeAttribution: ShopCiergeAttributionSchema,

    // New fields (all optional)
    name: String,
    email: String,
    confirmationNumber: String,
    displayFulfillmentStatus: String,
    displayFinancialStatus: String,
    totalPriceSet: MoneyBagSchema,
    subtotalPriceSet: MoneyBagSchema,
    totalShippingPriceSet: MoneyBagSchema,
    totalTaxSet: MoneyBagSchema,
    totalDiscountsSet: MoneyBagSchema,
    shippingAddress: AddressSchema,
    billingAddress: AddressSchema,
    processedAt: String,
    cancelledAt: String,
    cancelReason: String,
    closed: Boolean,
    closedAt: String,
    currencyCode: String,
    taxesIncluded: Boolean,
    taxExempt: Boolean,
    fullyPaid: Boolean,
    refundable: Boolean,
    requiresShipping: Boolean,
    tags: [String],
    note: String,
    phone: String,
    paymentGatewayNames: [String],
  },
  { timestamps: true, strict: false }
);

// Export the Order model
module.exports = mongoose.model('orders', OrderSchema);
