/**
 * 美国站费率配置
 * 数据来源：公开资料整理，2026 年口径
 * ⚠ 上线前请到 Seller Hub 核对你要覆盖的类目
 */

export default {
  storeLabel: "Store subscription",
  id: "us",
  name: "United States",
  symbol: "$",
  currency: "USD",
  locale: "en-US",
  updated: "October 2026",

  // 个人/偶尔卖家美国站无全面豁免，结构与商业卖家一致
  privateZeroFee: false,

  // 分档：cap 以内按 rate，超出部分按 above
  categories: [
    { n: "Most categories",                  rate: 13.25, above: 2.35, cap: 7500 },
    { n: "Books, DVDs, Movies & Music",      rate: 14.95, above: 2.35, cap: 7500 },
    { n: "Clothing, Shoes & Accessories",    rate: 13.25, above: 2.35, cap: 7500 },
    { n: "Consumer Electronics",             rate: 12.35, above: 2.35, cap: 7500 },
    { n: "Cell phones & Computers",          rate: 8.70,  above: 2.35, cap: 7500 },
    { n: "Musical Instruments & Guitars",    rate: 6.35,  above: 2.35, cap: 7500 },
    { n: "Sneakers ($150 and over)",         rate: 8.00,  above: 2.35, cap: 7500 },
    { n: "Jewelry & Watches (under $1,000)", rate: 15.00, above: 2.35, cap: 1000 },
    { n: "Trading Cards",                    rate: 13.25, above: 2.35, cap: 7500 },
    { n: "Heavy Equipment & Commercial",     rate: 3.00,  above: 3.00, cap: null },
  ],

  // 每单固定费：<=threshold 收 atOrBelow，>threshold 收 above
  perOrder: { threshold: 10, atOrBelow: 0.40, above: 0.30 },

  // 监管运营费：仅商业卖家
  regulatory: { rate: 0.35, label: "Regulatory operating fee" },

  // 国际费
  international: {
    label: "International fee",
    bands: { intl: 1.65 },
  },

  // 店铺等级折扣（FVF 减免百分点）
  storeOptions: [
    { label: "No Store", cut: 0 },
    { label: "Basic / Premium / Anchor", cut: 0.55 },
  ],

  // 插入费
  insertOptions: [
    { label: "No (within 250 free listings)", v: 0 },
    { label: "Yes ($0.35)", v: 0.35 },
  ],

  // 美国站不对费用本身收 VAT
  vatOnFees: null,

  // 卖家类型
  sellerTypes: [
    { label: "Business seller", business: true },
    { label: "Private / occasional seller", business: false },
  ],
  defaultBusiness: true,

  // 页面文案
  copy: {
    shipLabel: "Shipping charged to buyer",
    costLabel: "Your item cost / COGS",
    shipCostLabel: "Actual shipping label cost",
    intlOption: "International (+1.65%)",
    domesticOption: "US buyer",
  },
};
