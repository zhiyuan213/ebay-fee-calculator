/**
 * Etsy 美国站费率配置
 * 数据来源：Etsy 官方 Fees & Payments 政策 + 多个第三方计算器交叉验证，2026 年口径
 *
 * ⚠ 数据冲突说明（诚实标注，已在页面 notes / FAQ 中同样提示）：
 *   - 刊登费 $0.20、交易费 6.5%、支付处理 3% + $0.25、站外广告 12%/15%（封顶 $100）
 *     → 官方明确，高置信度
 *   - 监管运营费：各来源说法不一，有说美国不收、有说 0.25%、也有说 0.8%
 *     → 做成可选下拉，默认「不收」，并在页面上写明需自行核对账单
 *   - 上线前请以 Shop Manager → 财务 为准
 *
 * 与 eBay 的四点结构差异（这是真正的差异，不是换个平台名）：
 * 1. 有两套不同的计费基数：交易费按「商品价+运费」（美国不含销售税），
 *    支付处理费按「含销售税」的总额 —— eBay 只有一套基数
 * 2. 支付处理费是「百分比 + 固定额」的组合，eBay 的每单费是纯固定额
 * 3. 站外广告费 12%/15%，单笔封顶 $100 —— eBay 的推广刊登无封顶
 * 4. 无类目费率差异，但「受监管类目」（美妆个护）额外加 2.5%
 */

export default {
  storeLabel: "Shop level",
  id: "etsy-us",
  name: "Etsy (US)",
  symbol: "$",
  currency: "USD",
  locale: "en-US",
  updated: "October 2026",

  privateZeroFee: false,

  // Etsy 专有分层计费
  etsy: {
    // 支付处理：基数含销售税
    processing: { rate: 3, flat: 0.25 },
    // 站外广告：按商店过去 12 个月销售额分档，单笔封顶 $100
    offsiteAds: {
      bands: { none: 0, under10k: 15, over10k: 12 },
      cap: 100,
    },
  },

  // 类目：Etsy 无类目差异，但受监管类目加 2.5%（6.5% + 2.5% = 9.0%）
  categories: [
    { n: "Standard category (6.5%)", rate: 6.5, above: 6.5, cap: null, key: "std" },
    { n: "Regulated category — health & beauty, cosmetics (+2.5%)", rate: 9.0, above: 9.0, cap: null, key: "reg" },
  ],
  defaultCatIdx: 0,

  // 美国站没有 Pro 计划 / 店铺订阅体系
  storeOptions: [{ label: "No Etsy Plus subscription", cut: 0 }],

  // 刊登费：每条 $0.20，有效 4 个月，卖出或续期时再收
  insertOptions: [
    { label: "New or renewed listing ($0.20)", v: 0.2 },
    { label: "Already paid — no listing fee", v: 0 },
  ],

  // 监管运营费：各来源冲突，做成可选，默认不收
  regOptions: [
    { label: "None — most US shops", v: 0 },
    { label: "0.25% — if it appears on your statement", v: 0.25 },
    { label: "0.8% — some published figures", v: 0.8 },
  ],

  // Etsy 没有 eBay 那种每单固定费（固定额在支付处理费里）
  perOrder: { threshold: 0, atOrBelow: 0, above: 0 },

  // 监管运营费：默认 0，由页面下拉覆盖
  regulatory: { label: "Regulatory operating fee", rate: 0 },

  // 货币兑换费 2.5%：复用 international 机制（买家币种与店铺币种不同时）
  international: {
    label: "Currency conversion fee",
    bands: { other: 2.5 },
  },
  intlLabels: { other: "Buyer pays in a different currency (2.5%)" },

  sellerTypes: [
    { label: "US-based shop", business: true },
  ],
  defaultBusiness: true,

  copy: {
    shipLabel: "Shipping charged to buyer",
    costLabel: "Item cost / materials",
    shipCostLabel: "Actual shipping label cost",
    intlOption: "Different currency",
    domesticOption: "Same currency (USD)",
  },

  notes: [
    "Etsy has no per-order fee. Instead the payment processing fee carries the flat part — 3% plus $0.25 in the US.",
    "The two percentage bases are the part everyone gets wrong: the 6.5% transaction fee is charged on item price plus shipping, and for US shops it excludes sales tax. The 3% + $0.25 processing fee is charged on the total including sales tax. That is why Etsy's effective rate feels higher than 6.5%.",
    "Offsite Ads is the fee that wrecks margins. If a buyer clicks an Etsy-run ad on Google, Facebook or Pinterest and buys within 30 days, you pay 15% (or 12% once your trailing 12-month sales pass $10,000). It is capped at $100 per order. Shops under $10,000 a year can opt out; above it, you cannot.",
    "The Etsy listing fee is $0.20 and lasts four months. It is charged again every renewal, and again on each unit sold from a multi-quantity listing — a shop with 100 listings pays about $20 per cycle whether anything sells or not.",
    "Sales tax is not your money. Etsy collects and remits it as a marketplace facilitator in all 50 states. It does not reach your payout, but it does inflate the processing fee base.",
    "On the regulatory operating fee: sources disagree on whether US shops pay it at all, and some report 0.25%. It is left as an option here rather than baked in. Check your payment account and pick whichever matches.",
  ],
};
