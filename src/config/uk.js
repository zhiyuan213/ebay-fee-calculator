/**
 * 英国站费率配置
 * 数据来源：公开资料整理，2026 年口径
 * ⚠ 英国站规则与美国差异很大，上线前务必到 eBay.co.uk 官方费率页核对
 *
 * 三个与美国相反 / 美国没有的点：
 * 1. 英国居民私人卖家自 2024-10 起 FVF 归零（汽车类除外）
 * 2. 每单固定费方向相反：<=£10 收 £0.30，>£10 收 £0.40（美国是小额贵）
 * 3. 费用本身要加 20% VAT，未注册 VAT 的卖家是真实成本
 */

export default {
  storeLabel: "Shop subscription",
  id: "uk",
  name: "United Kingdom",
  symbol: "£",
  currency: "GBP",
  locale: "en-GB",
  updated: "October 2026",

  // 英国居民私人卖家 0% FVF
  privateZeroFee: true,

  // 商业卖家分档费率（ex VAT），多数来源一致的部分已取交集
  categories: [
    { n: "Most categories / Everything else",  rate: 12.9, above: null, cap: null },
    { n: "Clothes, Shoes & Accessories",        rate: 11.9, above: null, cap: null },
    { n: "Books, Comics & Magazines",           rate: 9.9,  above: null, cap: null },
    { n: "Films & TV, Music",                   rate: 9.9,  above: null, cap: null },
    { n: "Video Games & Consoles",              rate: 9.9,  above: null, cap: null },
    { n: "Computers, Tablets & Networking",     rate: 9.9,  above: 3.0,  cap: 1000 },
    { n: "Mobile & Smart Phones",               rate: 6.9,  above: 3.0,  cap: 1000 },
    { n: "Cameras & Photography",               rate: 9.9,  above: null, cap: null },
    { n: "Sound & Vision (TVs, Headphones)",    rate: 6.9,  above: 3.0,  cap: 1000 },
    { n: "Collectables, Toys & Games",          rate: 10.9, above: null, cap: null },
    { n: "Sporting Goods",                      rate: 10.9, above: null, cap: null },
    { n: "Musical Instruments & DJ Equipment",  rate: 10.9, above: null, cap: null },
    { n: "Home, Furniture & DIY",               rate: 11.9, above: 7.9,  cap: 500 },
    { n: "Health & Beauty",                     rate: 10.9, above: null, cap: null },
    { n: "Business, Office & Industrial",       rate: 12.5, above: null, cap: null },
    { n: "Pet Supplies",                        rate: 12.9, above: null, cap: null },
    { n: "Vehicle Parts & Accessories",         rate: 9.5,  above: 3.0,  cap: 750 },
    { n: "Jewellery & Watches",                 rate: 14.9, above: 4.0,  cap: 1000 },
  ],

  // 英国：<=£10 收 £0.30，>£10 收 £0.40（2026-02 起）
  perOrder: { threshold: 10, atOrBelow: 0.30, above: 0.40 },

  regulatory: { rate: 0.35, label: "Regulatory operating fee" },

  // 国际费按买家地区分档（商业卖家）
  international: {
    label: "International fee",
    bands: { eu: 1.05, usca: 1.8, other: 2.0 },
    privateRate: 3.0, // 私人卖家发往海外
  },

  // 英国店铺订阅不降低 FVF，只增加免费刊登额度
  storeOptions: [
    { label: "No Shop", cut: 0 },
    { label: "Basic / Featured / Anchor Shop", cut: 0 },
  ],

  insertOptions: [
    { label: "No (within free allowance)", v: 0 },
    { label: "Yes (£0.35)", v: 0.35 },
  ],

  // 费用上的 20% VAT
  vatOnFees: { rate: 20, label: "VAT on fees" },

  sellerTypes: [
    { label: "Business seller", business: true },
    { label: "Private seller (UK resident)", business: false },
  ],
  defaultBusiness: true,

  copy: {
    shipLabel: "Postage charged to buyer",
    costLabel: "Your item cost / COGS",
    shipCostLabel: "Actual postage label cost",
    intlOption: "Overseas buyer",
    domesticOption: "UK buyer",
  },

  // 站点专属提示，会渲染在页面上
  notes: [
    "Private sellers resident in the UK pay no final value fee and no regulatory operating fee on most categories since October 2024. Motors categories are excluded.",
    "Business sellers pay 20% VAT on top of every fee. If you are VAT-registered you reclaim it, so untick the VAT box to see your true cost.",
    "Unlike eBay US, a UK Shop subscription does not reduce your final value fee — it only adds listing credits.",
    "Top Rated Sellers get a 10% discount on the variable part of the final value fee. Below Standard sellers pay an extra 6 percentage points.",
  ],
};
