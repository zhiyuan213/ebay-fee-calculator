/**
 * 加拿大站费率配置
 * 数据来源：eBay.ca 官方卖家中心（权威）+ 公开资料交叉验证，2026 年口径
 * ⚠ Store 折扣各省/各来源说法不一，上线前请到 eBay.ca 核对
 *
 * 与美国、英国都不一样的四点（这是本页的内容差异点，不是换个币种而已）：
 * 1. 每单固定费方向与英国一致、与美国相反：<=C$10 收 C$0.30，>C$10 收 C$0.40
 * 2. 没有监管运营费（美国 0.35%、英国 0.35%，加拿大为 0）
 * 3. 国际费按目的地分档：美国 0.4%、其他 1%，比美国的统一 1.65% 低得多
 * 4. 费用本身要按省份交 GST/HST/QST（5% ~ 15%），未注册者可抵、未注册者是真实成本
 */

export default {
  id: "ca",
  name: "Canada",
  symbol: "C$",
  currency: "CAD",
  locale: "en-CA",
  updated: "October 2026",

  privateZeroFee: false,

  // 分档：cap 以内按 rate，超出部分按 above（per item）
  categories: [
    { n: "Most categories",                       rate: 13.6,  above: 2.35, cap: 7500 },
    { n: "Books, Movies & Music",                 rate: 15.3,  above: 2.35, cap: 7500 },
    { n: "Coins & Paper Money",                   rate: 13.25, above: 2.35, cap: 7500 },
    { n: "Trading Cards & Select Collectibles",   rate: 13.25, above: 2.35, cap: 7500 },
    { n: "Guitars & Basses",                      rate: 6.7,   above: 2.35, cap: 7500 },
    { n: "Athletic Shoes (C$150 and over)",       rate: 8.0,   above: 2.35, cap: 7500 },
    { n: "Video Game Consoles",                   rate: 7.0,   above: 2.35, cap: 7500 },
    { n: "Eligible NFT categories",               rate: 5.0,   above: 5.0,  cap: null },
    { n: "Heavy Equipment & Commercial",          rate: 3.0,   above: 0.5,  cap: 15000 },
  ],

  // 每单固定费：<=C$10 收 C$0.30，>C$10 收 C$0.40（与美国方向相反）
  perOrder: { threshold: 10, atOrBelow: 0.30, above: 0.40 },

  // 加拿大没有监管运营费 —— 有些第三方计算器会加 0.4%，那是错的
  regulatory: null,

  // 国际费按买家目的地分档，比美国统一 1.65% 低
  international: {
    label: "International fee",
    bands: { us: 0.4, other: 1.0 },
  },

  // 店铺订阅降低 FVF（百分点）。eBay 官方只公布类目费率，
  // 各来源对 Store 折扣的具体数值说法不一，取最常见的 12.95% 反推
  storeOptions: [
    { label: "No Store", cut: 0 },
    { label: "Basic / Premium / Anchor", cut: 0.65 },
  ],

  // 250 条免费，之后每条 C$0.30（eBay.ca 官方口径）
  insertOptions: [
    { label: "No (within 250 free listings)", v: 0 },
    { label: "Yes (C$0.30)", v: 0.30 },
  ],

  // 费用上的销售税：按卖家所在省份，5%(GST) ~ 15%(HST)
  // 已注册 GST/HST 的可作为进项税抵扣，未注册的是真实成本
  feeTax: {
    label: "GST/HST on fees",
    options: [
      { label: "Alberta / NWT / Nunavut / Yukon (5% GST)", rate: 5 },
      { label: "British Columbia / Manitoba (12%)", rate: 12 },
      { label: "Saskatchewan (11%)", rate: 11 },
      { label: "Ontario (13% HST)", rate: 13 },
      { label: "Quebec (14.975% GST+QST)", rate: 14.975 },
      { label: "Atlantic provinces (15% HST)", rate: 15 },
      { label: "None — I reclaim it as an ITC", rate: 0 },
    ],
    defaultIndex: 3,
  },

  sellerTypes: [
    { label: "Business seller", business: true },
    { label: "Private / occasional seller", business: false },
  ],
  defaultBusiness: true,

  copy: {
    shipLabel: "Shipping charged to buyer",
    costLabel: "Your item cost / COGS",
    shipCostLabel: "Actual shipping label cost",
    intlOption: "Outside Canada",
    domesticOption: "Canadian buyer",
  },

  // 站点专属提示，会渲染成独立区块 —— 这部分是与 US/UK 页面的实质差异
  notes: [
    "Canada has no regulatory operating fee. Some third-party calculators quietly add 0.4% — if you see that line on a Canadian sale, it is not an eBay Canada charge.",
    "The international fee is much lower here than in the US: 0.4% for delivery to the United States and 1% elsewhere, against a flat 1.65% south of the border. Both are waived if you ship through eBay International Shipping.",
    "GST/HST applies to eBay's fees, not just to the sale, and the rate depends on your province. If you are registered you claim it back as an input tax credit, so pick the last option to see your true cost.",
    "Sales tax is not your cost: eBay collects GST/HST/PST/QST from the buyer and remits it. But the final value fee is calculated on the tax-inclusive total, so collected tax nudges your effective rate up slightly.",
    "The per-order fee runs the opposite way to the US: C$0.30 at C$10 or under, rising to C$40 cents above C$10. Athletic shoes at C$150 and over skip it entirely.",
  ],
};
