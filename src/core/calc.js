/**
 * 费用计算核心 —— 站点无关，所有差异由 config 驱动
 * 新增站点只需加一个 config 文件，无需改动本文件
 */

/**
 * @typedef {Object} Input
 * @property {number} price        商品售价
 * @property {number} shipCharge   向买家收取的运费
 * @property {number} cost         商品成本 COGS
 * @property {number} shipCost     实际支付的运费标签成本
 * @property {number} catIdx       类目索引
 * @property {number} adRate       广告费率 %
 * @property {number} insertFee    插入费
 * @property {Object} opts         卖家类型 / 地区 / 店铺等开关
 */

/**
 * 计算单笔订单的全部费用与利润
 * @param {Object} cfg 站点配置（us.js / uk.js）
 * @param {Input} o    输入
 */
export function calc(cfg, o) {
  const cat = cfg.categories[o.catIdx] || cfg.categories[0];
  const sym = cfg.symbol;

  const price = num(o.price);
  const shipCharge = num(o.shipCharge);
  const subtotal = price + shipCharge; // 买家支付总额

  // ---- 1. Final value fee（含分档）----
  let rate = cat.rate / 100;
  if (o.opts.storeCut) rate -= o.opts.storeCut / 100;
  rate = Math.max(0, rate);
  if (o.opts.privateSeller && cfg.privateZeroFee) rate = 0;

  const above = cat.above != null ? cat.above / 100 : rate;
  const cap = cat.cap != null ? cat.cap : Infinity;

  let fvf;
  if (subtotal <= cap) {
    fvf = subtotal * rate;
  } else {
    fvf = cap * rate + (subtotal - cap) * above;
  }
  if (cfg.fvfCap && fvf > cfg.fvfCap) fvf = cfg.fvfCap;

  // ---- 2. Per-order fee ----
  // US: <=$10 收 $0.40，>$10 收 $0.30
  // UK: <=£10 收 £0.30，>£10 收 £0.40  （方向相反，由 config 表达）
  let perOrder = 0;
  if (subtotal > 0) {
    perOrder = subtotal <= cfg.perOrder.threshold
      ? cfg.perOrder.atOrBelow
      : cfg.perOrder.above;
  }

  // ---- 3. Regulatory operating fee ----
  let regulatory = 0;
  if (cfg.regulatory && !(o.opts.privateSeller && cfg.privateZeroFee)) {
    regulatory = subtotal * (cfg.regulatory.rate / 100);
  }

  // ---- 4. International fee ----
  let intl = 0;
  const intlKey = o.opts.intl;
  if (intlKey && cfg.international) {
    const bands = cfg.international.bands;
    let intlRate = bands[intlKey] != null ? bands[intlKey] : 0;
    // 英国私人卖家发往海外按 3% 计
    if (o.opts.privateSeller && cfg.international.privateRate != null) {
      intlRate = cfg.international.privateRate;
    }
    intl = subtotal * (intlRate / 100);
  }

  // ---- 5. Promoted listings ----
  const promoted = subtotal * (num(o.adRate) / 100);

  // ---- 6. Insertion fee ----
  const insertion = num(o.insertFee);

  // ---- 汇总 ----
  let totalFees = fvf + perOrder + regulatory + intl + promoted + insertion;

  // 费用上征收的税：
  //   英国 VAT 20%（开关式）  加拿大 GST/HST/QST 按省 5%~15%（下拉式）
  // 两种都由 config 表达，UI 侧渲染成不同控件，计算侧统一成 feeTaxRate
  const taxRate = feeTaxRate(cfg, o.opts);
  let vat = 0;
  if (taxRate > 0) {
    vat = totalFees * (taxRate / 100);
    totalFees += vat;
  }

  const payout = subtotal - totalFees;
  const cost = num(o.cost);
  const shipCost = num(o.shipCost);
  const profit = payout - cost - shipCost;

  const margin = subtotal > 0 ? (profit / subtotal) * 100 : 0;
  const roi = cost > 0 ? (profit / cost) * 100 : 0;
  const effRate = subtotal > 0 ? (totalFees / subtotal) * 100 : 0;

  // 盈亏平衡：payout = cost + shipCost
  // 费用结构：比例部分 k = rate + reg + intlRate + ad，固定部分 f = perOrder + insertion
  // 若站点对费用征 VAT（英国 20%），固定部分同样被征税，必须一并折算，否则平衡点偏低
  const vatMul = 1 + taxRate / 100;
  const k =
    rate +
    (regulatory > 0 ? cfg.regulatory.rate / 100 : 0) +
    (intl > 0 ? intl / subtotal || 0 : 0) +
    num(o.adRate) / 100;
  const denom = 1 - k * vatMul;
  const breakeven =
    denom > 0 ? (cost + shipCost + (perOrder + insertion) * vatMul) / denom : 0;

  return {
    symbol: sym,
    subtotal, fvf, perOrder, regulatory, intl, promoted, insertion,
    vat, totalFees, payout, profit, margin, roi, effRate,
    breakeven: Math.max(0, breakeven),
    ratePct: rate * 100,
  };
}

/**
 * 反向定价：已知成本与目标利润，反推应标售价
 * 费用是按售价抽成，不是按成本，所以必须做除法而非加减
 */
export function reversePrice(cfg, o) {
  const cat = cfg.categories[o.catIdx] || cfg.categories[0];
  let rate = cat.rate / 100;
  if (o.opts.storeCut) rate -= o.opts.storeCut / 100;
  rate = Math.max(0, rate);

  const cost = num(o.cost);
  const shipCost = num(o.shipCost);
  const shipCharge = num(o.shipCharge);
  const target = num(o.targetProfit);
  const ad = num(o.adRate) / 100;

  const reg = cfg.regulatory ? cfg.regulatory.rate / 100 : 0;
  // 英国站费用本身要加 20% VAT，固定费同样被征税，反向公式必须折算
  // profit = T - (T*k + f)*vatMul - cost - shipCost = target
  //   =>  T = (target + cost + shipCost + f*vatMul) / (1 - k*vatMul)
  const vatMul = 1 + feeTaxRate(cfg, o.opts) / 100;
  const k = rate + reg + ad;
  const denom = 1 - k * vatMul;
  if (denom <= 0) return null;

  const perOrder = cfg.perOrder.above; // 预估按高额档
  const requiredTotal =
    (target + cost + shipCost + perOrder * vatMul) / denom;
  const itemPrice = Math.max(0, requiredTotal - shipCharge);

  return { itemPrice, requiredTotal };
}

/**
 * 取费用税率（百分点）
 * cfg.feeTax 存在时用下拉选中的省份税率；否则回落到 cfg.vatOnFees 开关
 */
export function feeTaxRate(cfg, opts) {
  if (cfg.feeTax) {
    const idx = opts.feeTaxIdx;
    const opt = cfg.feeTax.options[idx];
    return opt ? opt.rate : (cfg.feeTax.options[cfg.feeTax.defaultIndex]?.rate ?? 0);
  }
  if (cfg.vatOnFees && opts.chargeVat) return cfg.vatOnFees.rate;
  return 0;
}

export function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}
