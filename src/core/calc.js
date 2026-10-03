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
/**
 * 解析适用费率与超出档费率
 * 澳洲（cfg.planRates）：卖家计划 × 类目 tier 的二维矩阵，2026 年 5 月起生效
 * 其余站点：类目费率减去店铺订阅折扣
 */
export function resolveRate(cfg, cat, opts) {
  if (cfg.planRates) {
    const planKey = opts.planKey || cfg.defaultPlan;
    const catKey = cat.key || "t2";
    const row = cfg.planRates[planKey] || cfg.planRates[cfg.defaultPlan] || {};
    const rate = row[catKey] != null ? row[catKey] : cat.rate;
    const above = cfg.planAbove && cfg.planAbove[planKey] != null
      ? cfg.planAbove[planKey]
      : (cat.above != null ? cat.above : rate);
    return { rate: rate / 100, above: above / 100 };
  }
  let rate = cat.rate / 100;
  if (opts.storeCut) rate -= opts.storeCut / 100;
  rate = Math.max(0, rate);
  if (opts.privateSeller && cfg.privateZeroFee) rate = 0;
  return { rate, above: (cat.above != null ? cat.above : cat.rate) / 100 };
}

/**
 * 解析每单固定费
 * 澳洲各计划是单一固定值（含 GST），不走金额分档
 */
export function resolvePerOrder(cfg, subtotal, opts) {
  if (subtotal <= 0) return 0;
  if (cfg.planPerOrder) {
    const planKey = opts.planKey || cfg.defaultPlan;
    return cfg.planPerOrder[planKey] != null ? cfg.planPerOrder[planKey] : 0;
  }
  return subtotal <= cfg.perOrder.threshold
    ? cfg.perOrder.atOrBelow
    : cfg.perOrder.above;
}

/**
 * 费用总额的乘数：费用上的税 / 已含的消费税
 * 澳洲费率本身已含 10% GST；注册 GST 的卖家 eBay 按不含税收取，故除以 1.1
 */
export function feeMultiplier(cfg, opts) {
  const taxRate = feeTaxRate(cfg, opts);
  const div = (cfg.gst && cfg.gst.included && opts.gstExempt)
    ? 1 + cfg.gst.rate / 100
    : 1;
  return (1 + taxRate / 100) / div;
}

export function calc(cfg, o) {
  const cat = cfg.categories[o.catIdx] || cfg.categories[0];
  const sym = cfg.symbol;

  const price = num(o.price);
  const shipCharge = num(o.shipCharge);
  const subtotal = price + shipCharge; // 买家支付总额（不含销售税）

  // 销售税：由平台代收代缴，不进入卖家到账金额，但会放大支付处理费的基数
  // Etsy 美国站：交易费不含销售税，支付处理费含销售税
  const taxAmount = subtotal * (num(o.taxRate) / 100);

  // ---- 1. Final value fee（含分档）----
  const { rate, above } = resolveRate(cfg, cat, o.opts);
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
  const perOrder = resolvePerOrder(cfg, subtotal, o.opts);

  // ---- 3. Regulatory operating fee ----
  let regulatory = 0;
  if (cfg.regulatory && !(o.opts.privateSeller && cfg.privateZeroFee)) {
    // Etsy：费率由页面下拉给出（各来源冲突，默认 0）
    const regRate = o.opts.regRate != null ? o.opts.regRate : cfg.regulatory.rate;
    regulatory = subtotal * (regRate / 100);
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

  // ---- 5b. Etsy 专有：支付处理费 + 站外广告费 ----
  // 支付处理费基数含销售税；站外广告按销售额分档且单笔封顶
  let processing = 0;
  let offsiteAds = 0;
  if (cfg.etsy) {
    if (subtotal > 0) {
      processing = (subtotal + taxAmount) * (cfg.etsy.processing.rate / 100)
        + cfg.etsy.processing.flat;
    }
    const band = cfg.etsy.offsiteAds.bands[o.opts.offsiteKey];
    if (band) {
      offsiteAds = Math.min(subtotal * (band / 100), cfg.etsy.offsiteAds.cap);
    }
  }

  // ---- 6. Insertion fee ----
  const insertion = num(o.insertFee);

  // ---- 汇总 ----
  const base = fvf + perOrder + regulatory + intl + promoted + insertion
    + processing + offsiteAds;

  // 费用上征收的税：
  //   英国 VAT 20%（开关式）  加拿大 GST/HST/QST 按省 5%~15%（下拉式）
  // 两种都由 config 表达，UI 侧渲染成不同控件，计算侧统一成 feeTaxRate
  const taxRate = feeTaxRate(cfg, o.opts);
  const vat = base * (taxRate / 100);
  let totalFees = base + vat;

  // 澳洲费率已含 GST，注册 GST 并提供 ABN 的卖家按不含税计
  let gstSaved = 0;
  if (cfg.gst && cfg.gst.included && o.opts.gstExempt) {
    const before = totalFees;
    totalFees = totalFees / (1 + cfg.gst.rate / 100);
    gstSaved = before - totalFees;
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
  const vatMul = feeMultiplier(cfg, o.opts);
  const k =
    rate +
    (regulatory > 0 ? regulatory / subtotal || 0 : 0) +
    (intl > 0 ? intl / subtotal || 0 : 0) +
    num(o.adRate) / 100 +
    (cfg.etsy ? cfg.etsy.processing.rate / 100 : 0) +
    (offsiteAds > 0 ? offsiteAds / subtotal || 0 : 0);
  const denom = 1 - k * vatMul;
  const flatFees = perOrder + insertion
    + (cfg.etsy ? cfg.etsy.processing.flat : 0);
  const breakeven =
    denom > 0 ? (cost + shipCost + flatFees * vatMul) / denom : 0;

  return {
    symbol: sym,
    subtotal, taxAmount, fvf, perOrder, regulatory, intl, promoted, insertion,
    processing, offsiteAds,
    vat, gstSaved, totalFees, payout, profit, margin, roi, effRate,
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
  const { rate } = resolveRate(cfg, cat, o.opts);

  const cost = num(o.cost);
  const shipCost = num(o.shipCost);
  const shipCharge = num(o.shipCharge);
  const target = num(o.targetProfit);
  const ad = num(o.adRate) / 100;

  const reg = o.opts.regRate != null ? o.opts.regRate / 100
    : (cfg.regulatory ? cfg.regulatory.rate / 100 : 0);
  const proc = cfg.etsy ? cfg.etsy.processing.rate / 100 : 0;
  const off = cfg.etsy && cfg.etsy.offsiteAds.bands[o.opts.offsiteKey]
    ? cfg.etsy.offsiteAds.bands[o.opts.offsiteKey] / 100 : 0;
  // 英国站费用本身要加 20% VAT，固定费同样被征税，反向公式必须折算
  // profit = T - (T*k + f)*vatMul - cost - shipCost = target
  //   =>  T = (target + cost + shipCost + f*vatMul) / (1 - k*vatMul)
  const vatMul = feeMultiplier(cfg, o.opts);
  const k = rate + reg + ad + proc + off;
  const denom = 1 - k * vatMul;
  if (denom <= 0) return null;

  // 澳洲各计划是单一固定值，其余站点按高额档预估；Etsy 无每单费
  let perOrder = cfg.planPerOrder
    ? (cfg.planPerOrder[o.opts.planKey || cfg.defaultPlan] ?? 0)
    : (cfg.perOrder ? cfg.perOrder.above : 0);
  if (cfg.etsy) perOrder += cfg.etsy.processing.flat;
  // 固定费：eBay 每单费 / Etsy 处理费固定额 + 刊登费
  // 漏掉刊登费会让反推价格偏低，正向回算达不到目标利润（差的就是 $0.20）
  const requiredTotal =
    (target + cost + shipCost + (perOrder + num(o.insertFee)) * vatMul) / denom;
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
