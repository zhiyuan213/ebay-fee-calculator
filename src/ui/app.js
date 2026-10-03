/**
 * UI 逻辑 —— 站点无关，全部由注入的 CONFIG 驱动
 * 新增站点 = 新增 config 文件 + build.mjs 里加一行，本文件不用改
 */
import { calc, reversePrice, num } from "../core/calc.js";
import { money, pct, row, sumRow, kpi, toCSV, download } from "../core/format.js";

const CFG = window.__CFG__;
const S = CFG.symbol;

/* ---------- 下拉框填充 ---------- */
function fill(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  items.forEach((it, i) => el.add(new Option(it.label ?? it.n, i)));
}
function fillAll() {
  ["s_cat", "b_cat", "r_cat"].forEach((id) => fill(id, CFG.categories));
  ["s_store", "b_store"].forEach((id) => fill(id, CFG.storeOptions));
  ["s_insert"].forEach((id) => fill(id, CFG.insertOptions));
  ["s_biz", "b_biz", "r_biz"].forEach((id) => fill(id, CFG.sellerTypes));
  fill("s_intl", intlOptions());
  fill("b_intl", intlOptions());
  // 默认值
  const setV = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  setV("s_biz", CFG.defaultBusiness ? 0 : 1);
  setV("b_biz", CFG.defaultBusiness ? 0 : 1);
  setV("r_biz", CFG.defaultBusiness ? 0 : 1);
  setV("r_vat", "1");
}
function intlOptions() {
  const bands = CFG.international?.bands || {};
  const opts = [{ label: CFG.copy.domesticOption, key: "" }];
  const map = { intl: CFG.copy.intlOption, eu: "Eurozone & Northern Europe (1.05%)", usca: "US & Canada (1.8%)", other: "All other countries (2.0%)" };
  Object.keys(bands).forEach((k) => opts.push({ label: map[k] || k, key: k }));
  return opts;
}

/* ---------- 收集表单 ---------- */
function optsFrom(p) {
  const bizEl = document.getElementById(p + "_biz");
  const stEl = document.getElementById(p + "_store");
  const intlEl = document.getElementById(p + "_intl");
  const vatEl = document.getElementById(p + "_vat");
  return {
    storeCut: stEl ? (CFG.storeOptions[+stEl.value]?.cut || 0) : 0,
    intl: intlEl ? (intlEl.options[intlEl.selectedIndex]?.label && intlEl.selectedIndex > 0
        ? Object.keys(CFG.international?.bands || {})[intlEl.selectedIndex - 1]
        : "") : "",
    privateSeller: bizEl ? !CFG.sellerTypes[+bizEl.value].business : false,
    chargeVat: vatEl ? vatEl.checked : true,
  };
}
function g(id) { const e = document.getElementById(id); return e ? e.value : 0; }

/* ---------- 单件模式 ---------- */
function runSingle() {
  const o = {
    price: g("s_price"), shipCharge: g("s_shipcharge"),
    cost: g("s_cost"), shipCost: g("s_shipcost"),
    catIdx: +g("s_cat"), adRate: g("s_ad"),
    insertFee: CFG.insertOptions[+g("s_insert")]?.v || 0,
    opts: optsFrom("s"),
  };
  const r = calc(CFG, o);
  const cat = CFG.categories[o.catIdx];
  const show = (v) => v > 0;

  let h = '<div class="big">'
    + kpi(money(r.profit, S), "Net profit", r.profit >= 0 ? "pos" : "neg")
    + kpi(money(r.payout, S), CFG.id === "uk" ? "eBay payout" : "eBay payout")
    + kpi(money(r.totalFees, S), "Total eBay fees")
    + kpi(pct(r.effRate), "Effective fee rate")
    + "</div>";

  h += '<table><tr><th>Fee breakdown</th><th style="text-align:right">Amount</th></tr>'
    + row(`Final value fee (${r.ratePct.toFixed(2)}%)`, money(r.fvf, S))
    + row("Per-order fee", money(r.perOrder, S))
    + (show(r.regulatory) ? row(`${CFG.regulatory.label} (${CFG.regulatory.rate}%)`, money(r.regulatory, S)) : "")
    + (show(r.intl) ? row(CFG.international.label, money(r.intl, S)) : "")
    + (show(r.promoted) ? row("Promoted Listings fee", money(r.promoted, S)) : "")
    + (show(r.insertion) ? row("Insertion fee", money(r.insertion, S)) : "")
    + (show(r.vat) ? row(`${CFG.vatOnFees.label} (${CFG.vatOnFees.rate}%)`, money(r.vat, S)) : "")
    + sumRow("Total fees", money(r.totalFees, S))
    + "</table>";

  h += '<table style="margin-top:14px"><tr><th>Your bottom line</th><th style="text-align:right">Amount</th></tr>'
    + row("Total buyer pays", money(r.subtotal, S))
    + row("Less total eBay fees", "-" + money(r.totalFees, S))
    + sumRow("eBay payout", money(r.payout, S))
    + row("Less item cost", "-" + money(num(o.cost), S))
    + row(`Less ${CFG.id === "uk" ? "postage label" : "shipping label"}`, "-" + money(num(o.shipCost), S))
    + sumRow("Net profit", money(r.profit, S), r.profit >= 0 ? "pos" : "neg")
    + "</table>";

  h += '<table style="margin-top:14px"><tr><th>Indicators</th><th style="text-align:right">Value</th></tr>'
    + row("Profit margin", pct(r.margin))
    + row("Return on cost (ROI)", pct(r.roi))
    + row("Break-even item price", money(Math.max(0, r.breakeven - num(o.shipCharge)), S))
    + "</table>";

  document.getElementById("s_res").innerHTML = h;
}

/* ---------- 批量模式 ---------- */
let bulkRows = [];
function runBulk() {
  const lines = document.getElementById("b_data").value.split("\n");
  const base = {
    catIdx: +g("b_cat"), adRate: g("b_ad"), insertFee: 0,
    opts: optsFrom("b"),
  };
  bulkRows = [];
  lines.forEach((line) => {
    line = line.trim();
    if (!line) return;
    const p = line.split(/[,\t;]+/).map((x) => x.trim());
    const o = Object.assign({}, base, {
      price: p[0] || 0, cost: p[1] || 0,
      shipCharge: p[2] || 0, shipCost: p[3] || 0,
    });
    o.r = calc(CFG, o);
    bulkRows.push(o);
  });
  if (!bulkRows.length) { document.getElementById("b_res").innerHTML = "<p>No data.</p>"; return; }

  let tP = 0, tF = 0, tPr = 0;
  bulkRows.forEach((o) => { tP += o.r.subtotal; tF += o.r.totalFees; tPr += o.r.profit; });

  let h = '<table><tr><th>#</th><th>Price</th><th>Cost</th><th>Ship ch.</th><th>Ship cost</th>'
    + '<th>Fees</th><th>Payout</th><th>Net profit</th><th>Margin</th></tr>';
  bulkRows.forEach((o, i) => {
    h += `<tr><td>${i + 1}</td>`
      + `<td class="num">${money(o.r.subtotal - num(o.shipCharge), S)}</td>`
      + `<td class="num">${money(num(o.cost), S)}</td>`
      + `<td class="num">${money(num(o.shipCharge), S)}</td>`
      + `<td class="num">${money(num(o.shipCost), S)}</td>`
      + `<td class="num">${money(o.r.totalFees, S)}</td>`
      + `<td class="num">${money(o.r.payout, S)}</td>`
      + `<td class="num ${o.r.profit >= 0 ? "pos" : "neg"}">${money(o.r.profit, S)}</td>`
      + `<td class="num ${o.r.profit >= 0 ? "pos" : "neg"}">${pct(o.r.margin)}</td></tr>`;
  });
  h += `<tr class="sum"><td>All</td><td colspan="4">${bulkRows.length} items</td>`
    + `<td class="num">${money(tF, S)}</td><td class="num">${money(tP - tF, S)}</td>`
    + `<td class="num ${tPr >= 0 ? "pos" : "neg"}">${money(tPr, S)}</td><td></td></tr></table>`;
  document.getElementById("b_res").innerHTML = h;
}
function exportCSV() {
  if (!bulkRows.length) runBulk();
  const rows = [["Item price", "Item cost", "Shipping charged", "Shipping cost",
    "Total buyer pays", "Total fees", "FVF", "Per-order", "Payout", "Net profit", "Margin %"]];
  bulkRows.forEach((o) => {
    rows.push([
      money(o.r.subtotal - num(o.shipCharge), S), money(num(o.cost), S),
      money(num(o.shipCharge), S), money(num(o.shipCost), S),
      money(o.r.subtotal, S), money(o.r.totalFees, S), money(o.r.fvf, S),
      money(o.r.perOrder, S), money(o.r.payout, S), money(o.r.profit, S),
      o.r.margin.toFixed(1),
    ]);
  });
  download(`ebay-${CFG.id}-fee-calculation.csv`, toCSV(rows));
}

/* ---------- 反向定价 ---------- */
function runReverse() {
  // 反向定价必须与校验用同一套开关，否则算出的售价预留不足
  // （英国站忘了 VAT，反推出的价格会比实际需要的低，利润达不到目标）
  const vatEl = document.getElementById("r_vat");
  const chargeVat = vatEl ? vatEl.value === "1" || vatEl.value === "true" : !!(CFG.vatOnFees);
  const bizEl = document.getElementById("r_biz");
  const privateSeller = bizEl ? !CFG.sellerTypes[+bizEl.value].business : false;
  const opts = { privateSeller, chargeVat };

  const o = {
    cost: g("r_cost"), shipCost: g("r_shipcost"), shipCharge: g("r_shipcharge"),
    targetProfit: g("r_target"), catIdx: +g("r_cat"), adRate: g("r_ad"),
    opts,
  };
  const res = reversePrice(CFG, o);
  if (!res) { document.getElementById("r_res").innerHTML = "<p>Invalid rate.</p>"; return; }

  const check = calc(CFG, {
    price: res.itemPrice, shipCharge: o.shipCharge, cost: o.cost,
    shipCost: o.shipCost, catIdx: o.catIdx, adRate: o.adRate, insertFee: 0,
    opts,
  });

  const cat = CFG.categories[o.catIdx];
  let h = '<div class="big">'
    + kpi(money(res.itemPrice, S), "Required item price")
    + kpi(money(res.requiredTotal, S), "Total buyer pays")
    + kpi(money(check.totalFees, S), "eBay fees at that price")
    + kpi(money(check.profit, S), "Net profit (check)", check.profit >= 0 ? "pos" : "neg")
    + "</div>";

  h += '<table><tr><th>How it breaks down</th><th style="text-align:right">Amount</th></tr>'
    + row("Required item price", money(res.itemPrice, S))
    + row(CFG.copy.shipLabel, money(num(o.shipCharge), S))
    + sumRow("Total buyer pays", money(res.requiredTotal, S))
    + row(`Final value fee (${cat.rate.toFixed(2)}%)`, money(check.fvf, S))
    + row("Per-order fee", money(check.perOrder, S))
    + (check.regulatory > 0 ? row(`${CFG.regulatory.label} (${CFG.regulatory.rate}%)`, money(check.regulatory, S)) : "")
    + (check.vat > 0 ? row(`${CFG.vatOnFees.label} (${CFG.vatOnFees.rate}%)`, money(check.vat, S)) : "")
    + sumRow("Total fees", money(check.totalFees, S))
    + row("Less item cost", "-" + money(num(o.cost), S))
    + row(`Less ${CFG.id === "uk" ? "postage" : "shipping"} label`, "-" + money(num(o.shipCost), S))
    + sumRow("Net profit", money(check.profit, S), check.profit >= 0 ? "pos" : "neg")
    + "</table>";
  document.getElementById("r_res").innerHTML = h;
}

/* ---------- 初始化 ---------- */
export function init() {
  fillAll();
  document.querySelectorAll(".tab").forEach((t) => {
    t.onclick = () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.remove("on"));
      t.classList.add("on");
      ["single", "bulk", "reverse"].forEach((k) => {
        document.getElementById("t-" + k).classList.toggle("hide", k !== t.dataset.t);
      });
    };
  });
  ["s_price","s_shipcharge","s_cost","s_shipcost","s_cat","s_store","s_ad","s_insert","s_biz","s_intl","s_vat"]
    .forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.oninput = runSingle;
      el.onchange = runSingle;
    });
  ["r_cost","r_shipcost","r_shipcharge","r_target","r_cat","r_ad","r_biz","r_vat"]
    .forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.oninput = runReverse;
      el.onchange = runReverse;
    });
  window.runBulk = runBulk;
  window.exportCSV = exportCSV;
  window.runReverse = runReverse;
  runSingle();
  runReverse();
}
