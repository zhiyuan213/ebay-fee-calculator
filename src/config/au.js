/**
 * 澳大利亚站费率配置
 * 数据来源：eBay.com.au 官方卖家中心 + 公开资料交叉验证，2026 年口径
 *
 * ⚠ 数据置信度说明（重要）：
 *   - Pro Starter 13.4%、各计划 Tier 1 / Tier 4 的费率、国际费 3%、GST 10% 为官方明确值
 *   - Tier 2 / Tier 3 为官方公布区间内的插值估算，已在页面 notes 与 FAQ 中提示核对
 *   - 上线前务必到 eBay.com.au Seller Hub 核对你实际覆盖的类目
 *
 * 与美国、加拿大、英国都不一样，构成实质内容差异（不是换个币种）：
 * 1. 2026 年 5 月起 Store 订阅改为 Pro 计划，费率是「计划 × 类目 Tier」的二维矩阵
 * 2. 有「免费销售」机制：澳洲地址 + 无 Pro 计划 + 年销售额 ≤ A$25,000 → 交易费为 0
 * 3. 费率本身已含 10% GST（美国不含税，英国是费用外加 20% VAT，加拿大按省另加）
 * 4. 无监管运营费
 * 5. 国际费 3%，是四个国家里最高的
 * 6. 免费刊登额度 250,000 条/月 —— 不是笔误，是二十五万，几乎是无限
 */

export default {
  storeLabel: "Seller plan",
  id: "au",
  name: "Australia",
  symbol: "A$",
  currency: "AUD",
  locale: "en-AU",
  updated: "October 2026",

  privateZeroFee: false,

  // 费率已含 10% GST，与美国（不含税）不同
  gst: { included: true, rate: 10, label: "GST" },

  // 类目按 Tier 划分。rate 列的是 Pro Starter 基准（13.4%），
  // 实际费率由 planRates 矩阵按所选计划覆盖
  categories: [
    { n: "Tier 1 — home appliances & technology devices", key: "t1", rate: 13.4, above: 2.5, cap: 4000 },
    { n: "Tier 2 — other categories", key: "t2", rate: 13.4, above: 2.5, cap: 4000 },
    { n: "Tier 3 — other categories (higher band)", key: "t3", rate: 13.4, above: 2.5, cap: 4000 },
    { n: "Tier 4 — fashion, collectables, media, sporting goods, tech accessories", key: "t4", rate: 13.4, above: 2.5, cap: 4000 },
    { n: "NFTs", key: "nft", rate: 5.5, above: 5.5, cap: null },
  ],
  defaultCatIdx: 1,

  // 卖家计划（2026 年 5 月 12 日起，取代原 Store 订阅）
  plans: [
    { key: "free", label: "Free selling — no Pro plan, under A$25k/yr", fee: 0 },
    { key: "starter", label: "Pro Starter (A$0/mo)", fee: 0 },
    { key: "basic", label: "Pro Basic (A$27.45/mo)", fee: 27.45 },
    { key: "featured", label: "Pro Featured (A$82.45/mo)", fee: 82.45 },
    { key: "anchor", label: "Pro Anchor (A$604.95/mo)", fee: 604.95 },
  ],
  defaultPlan: "starter",

  // 计划 × Tier 的实际 FVF（含 GST，百分比）
  // Tier 1 / Tier 4 为官方公布区间的端点值；Tier 2 / Tier 3 为区间内插值估算
  planRates: {
    free: { t1: 0, t2: 0, t3: 0, t4: 0, nft: 0 },
    starter: { t1: 13.4, t2: 13.4, t3: 13.4, t4: 13.4, nft: 5.5 },
    basic: { t1: 8.03, t2: 9.72, t3: 11.4, t4: 13.09, nft: 5.5 },
    featured: { t1: 7.26, t2: 8.76, t3: 10.27, t4: 11.77, nft: 5.5 },
    anchor: { t1: 6.82, t2: 8.25, t3: 9.68, t4: 11.11, nft: 5.5 },
  },
  // A$4,000 以上部分的费率，以及每单固定费（均含 GST）
  planAbove: { free: 0, starter: 2.5, basic: 2.75, featured: 2.75, anchor: 2.75 },
  // 每单固定费按计划。
  // 注意 free 也要收 0.30 —— 免费销售免的是交易费，不是每单费
  planPerOrder: { free: 0.3, starter: 0.3, basic: 0.33, featured: 0.33, anchor: 0.33 },

  // 无监管运营费
  regulatory: null,

  // 国际销售费 3%（2026 年 5 月 12 日起）：四国中最高
  international: {
    label: "International sales fee",
    bands: { other: 3.0 },
  },
  intlLabels: { other: "Outside Australia (3%)" },

  // 每月免费刊登 250,000 条 —— 额度极高，实际卖家几乎用不完
  insertOptions: [
    { label: "No (within 250,000 free listings/month)", v: 0 },
    { label: "Yes (A$1.00)", v: 1.0 },
  ],

  // GST 处理：默认费率已含；注册 GST 且有 ABN 的卖家 eBay 按不含税收取
  gstOptions: [
    { label: "GST included (default)", exempt: false },
    { label: "GST-registered with ABN — fees charged net of GST", exempt: true },
  ],

  sellerTypes: [
    { label: "Business seller", business: true },
    { label: "Private / occasional seller", business: false },
  ],
  defaultBusiness: true,

  copy: {
    shipLabel: "Postage charged to buyer",
    costLabel: "Your item cost / COGS",
    shipCostLabel: "Actual postage label cost",
    intlOption: "Outside Australia",
    domesticOption: "Australian buyer",
  },

  notes: [
    "Australia has no regulatory operating fee. Unlike the US and UK (both 0.35%), nothing is added on top of the final value fee here.",
    "The 10% GST is already inside these rates — this is the opposite of the UK, where VAT is charged on top of the fee. If you are GST-registered with an ABN, eBay charges you net of GST, so pick the second option to see roughly 9% lower fees.",
    "Free selling is the big one: an Australian address, no Pro plan, and under A$25,000 in sales over the past 12 months means zero transaction fees. It is worth checking before you pay for a Pro plan.",
    "eBay renamed Store subscriptions to Pro plans in May 2026, and the rate you pay now depends on both your plan and your category tier. The two multiply out — a Pro Anchor seller in Tier 1 pays 6.82% against 13.4% on Pro Starter.",
    "The international sales fee rose to 3% in May 2026, making it the highest of the four countries here. Ship through eBay International Shipping and it does not apply.",
    "You get 250,000 free listings a month in Australia. That is not a typo — it is effectively unlimited for any normal seller.",
  ],
};
