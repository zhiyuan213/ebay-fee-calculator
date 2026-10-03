/**
 * 构建脚本 —— 零依赖
 * 把 ES module 源码拼成一个 IIFE 注入 HTML 模板，每个站点输出一个单文件 HTML
 *
 * 用法：node build.mjs
 * 新增站点：在 SITES 里加一行
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { flagDefs, flagUse } from "./src/ui/flags.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(join(__dirname, p), "utf8");

/* ---------- 站点清单 ---------- */
/**
 * 站点 canonical 域名
 * 部署前用环境变量注入真实域名，例如：
 *   SITE_DOMAIN=https://yourdomain.com node build.mjs
 * 未设置时回落到 example.com 占位（不影响本地运行，上线前必须替换）
 */
const BASE = (process.env.SITE_DOMAIN || "https://example.com").replace(/\/$/, "");
const dom = (slug) => `${BASE}/${slug}`;

/**
 * Google Analytics 4 衡量 ID，形如 G-XXXXXXXXXX
 * 未设置则不注入任何脚本 —— 本地构建保持零外部请求，便于自检
 *   SITE_DOMAIN=https://basakit.com GA_ID=G-9TH6Q9RFEV node build.mjs
 */
const GA_ID = (process.env.GA_ID || "").trim();
const GA_OK = /^G-[A-Z0-9]{6,}$/.test(GA_ID);

/**
 * AdSense：发布商 ID（ca-pub-XXXXXXXXXXXXXXXX）
 * 未设置则不注入 —— 未通过审核前不要放广告位代码，只放验证脚本即可
 *   ADSENSE_CLIENT=ca-pub-1590351261982793 node build.mjs
 */
const ADS = (process.env.ADSENSE_CLIENT || "").trim();
const ADS_OK = /^ca-pub-\d{10,}$/.test(ADS);

/**
 * AdSense 验证脚本（head 内，async，不阻塞渲染）
 * 注意：这只是"网站所有权验证"。真正展示广告还需要另放 <ins class="adsbygoogle">
 */
function adsSnippet() {
  if (!ADS_OK) return "";
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS}" crossorigin="anonymous"></script>`;
}

function gaSnippet() {
  if (!GA_OK) return "";
  // async 加载：不阻塞渲染。放在 head 里但不参与首屏渲染路径
  return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_ID}');
</script>`;
}

const SITES = [
  {
    cfg: "us",
    flag: "🇺🇸",
    slug: "us-ebay-fee-calculator",
    domain: dom("us-ebay-fee-calculator"),
    title: "US eBay Fee Calculator — Final Value Fees & Net Profit (2026)",
    h1: "US eBay Fee Calculator",
    sub: "Calculate eBay final value fees, per-order fees and your real net profit — before you list.",
    desc: "Free US eBay fee calculator. Calculate eBay final value fees, per-order fees, promoted listing costs and your real net profit. Bulk calculation and CSV export included.",
    faq: "How eBay fees work in 2026",
  },
  {
    cfg: "ca",
    flag: "🇨🇦",
    slug: "ca-ebay-fee-calculator",
    domain: dom("ca-ebay-fee-calculator"),
    title: "Canada eBay Fee Calculator — FVF, GST/HST & Net Profit (2026)",
    h1: "Canada eBay Fee Calculator",
    sub: "Work out eBay.ca final value fees, the per-order charge, tax on fees and what you actually keep.",
    desc: "Free eBay Canada fee calculator for eBay.ca sellers. Final value fees by category, per-order fee, international fees to the US and abroad, provincial GST/HST on fees, and true net profit in CAD.",
    faq: "How eBay Canada fees work in 2026",
  },
  {
    cfg: "uk",
    flag: "🇬🇧",
    slug: "uk-ebay-fee-calculator",
    domain: dom("uk-ebay-fee-calculator"),
    title: "UK eBay Fee Calculator — FVF, VAT & Net Profit (2026)",
    h1: "UK eBay Fee Calculator",
    sub: "Work out eBay.co.uk final value fees, the per-order charge, VAT on fees and what you actually keep.",
    desc: "Free UK eBay fee calculator for eBay.co.uk sellers. Final value fees by category, per-order fee, regulatory operating fee, 20% VAT on fees and true net profit. Private and business seller rates.",
    faq: "How eBay UK fees work in 2026",
  },
];

/* ---------- 源码处理：剥离模块语法 ---------- */
function strip(src) {
  return src
    .replace(/^\s*import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/^\s*export\s+default\s+/gm, "const __unused_default__ = ")
    .replace(/^\s*export\s+/gm, "");
}

const coreCalc = strip(R("src/core/calc.js"));
const coreFmt = strip(R("src/core/format.js"));
const uiApp = strip(R("src/ui/app.js"));

const APP_BUNDLE = `(function(){\n${coreCalc}\n${coreFmt}\n${uiApp}\ninit();\n})();`;

const CSS = R("src/ui/styles.css");
const TPL = R("src/ui/template.html");

/* ---------- FAQ 正文 ---------- */
const FAQ = {
  us: {
    body: `
    <p class="lead-sm">Under eBay Managed Payments there is no separate PayPal charge. eBay bundles marketplace commission and payment processing into a single <b>final value fee</b>, calculated on the total amount the buyer pays — item price plus shipping — plus a flat per-order fee.</p>
    <ul style="margin:10px 0 0 20px;font-size:14px;color:#475569">
      <li><b>Final value fee:</b> 13.25% for most categories on the total sale up to $7,500. The portion above $7,500 drops to 2.35%.</li>
      <li><b>Per-order fee:</b> $0.30 per order, rising to $0.40 on orders under $10.</li>
      <li><b>Regulatory operating fee:</b> 0.35% for business sellers.</li>
      <li><b>International fee:</b> an extra 1.65% when the buyer or delivery address is outside the US.</li>
      <li><b>Insertion fee:</b> 250 free listings per month, then $0.35 each.</li>
      <li><b>Promoted Listings:</b> whatever ad rate you set, charged only when the item sells through the ad.</li>
    </ul>`,
    items: [
      ["Does eBay charge a fee on shipping?",
       "Yes. The final value fee is calculated on the total amount the buyer pays, which includes buyer-paid shipping. A $50 item with $8 shipping is charged on $58, not $50."],
      ["How much does eBay take from a $100 sale?",
       "For most categories: 13.25% of $100 is $13.25, plus the $0.30 per-order fee, plus a 0.35% regulatory fee for business sellers. Roughly $13.90 total, leaving about $86.10 before your item and shipping costs."],
      ["Is selling cheap items on eBay worth it?",
       "Below about $8–$10 the flat per-order fee weighs heavily: $0.40 on a $5 item is another 8% on top of the percentage fee. This is why low-priced items often fail to make money on eBay."],
      ["Does an eBay Store subscription save money?",
       "It reduces the final value fee in most categories and raises your free listing allowance. It usually pays off once monthly sales reach the low thousands of dollars, or once you exceed 250 listings a month."],
      ["How accurate are these numbers?",
       "This is an estimate based on published eBay US rates for 2026. Category rates vary and eBay adjusts its fee schedule periodically. Always confirm the exact rate for your category in Seller Hub before setting prices."],
    ],
  },
  ca: {
    body: `
    <p class="lead-sm">eBay Canada runs on managed payments, so there is no separate PayPal or card-processing charge — everything is folded into one <b>final value fee</b> plus a flat per-order fee. Two things make Canada genuinely different from the US schedule: there is <b>no regulatory operating fee</b>, and the <b>international fee is much lower</b>.</p>
    <ul style="margin:10px 0 0 20px;font-size:14px;color:#475569">
      <li><b>Final value fee:</b> 13.6% for most categories on the total sale up to C$7,500, then 2.35% on the portion above.</li>
      <li><b>Per-order fee:</b> C$0.30 on orders of C$10 or less, C$0.40 above C$10. Athletic shoes at C$150 and over skip it.</li>
      <li><b>Regulatory operating fee:</b> none in Canada, unlike the US and UK.</li>
      <li><b>International fee:</b> 0.4% to the United States, 1% elsewhere — against a flat 1.65% in the US.</li>
      <li><b>Insertion fee:</b> 250 free listings per month, then C$0.30 each.</li>
      <li><b>Tax on fees:</b> GST/HST applies to eBay's fees too, at your province's rate.</li>
    </ul>`,
    items: [
      ["Does eBay Canada charge a regulatory operating fee?",
       "No. Unlike the US (0.35%) and the UK (0.35%), eBay Canada has no regulatory operating fee. Some third-party calculators add 0.4% to Canadian sales — if you see that line, it is not an eBay Canada charge."],
      ["Is the international fee cheaper in Canada?",
       "Yes, considerably. Canada charges 0.4% for delivery to the United States and 1% to other countries, against a flat 1.65% on eBay US. Both are waived if you ship through eBay International Shipping."],
      ["Does the fee apply to sales tax?",
       "The final value fee is calculated on the total amount of the sale, which includes GST/HST/PST/QST that eBay collects from the buyer. The tax itself is remitted by eBay and never lands in your payout, but because it sits inside the fee base it pushes your effective rate up slightly."],
      ["Why is there a provincial tax line on my fees?",
       "GST/HST applies to eBay's fees as well as to the sale, and the rate depends on where you are registered — from 5% GST in Alberta to 15% HST in Atlantic Canada. If you are GST/HST-registered you claim it back as an input tax credit, so pick the last option in the list to see your true cost."],
      ["How much does eBay Canada take from a C$100 sale?",
       "In a 13.6% category with no Store subscription: C$13.60 in final value fee plus the C$0.40 per-order fee, so about C$14.00 before your item and shipping costs. Add provincial GST/HST on those fees if you are not registered."],
      ["Is the per-order fee the same as in the US?",
       "No — it runs the opposite way. Canada charges C$0.30 at C$10 or under and C$0.40 above C$10, while the US charges $0.40 under $10 and $0.30 above. Athletic shoes priced at C$150 or more are exempt."],
      ["How accurate are these numbers?",
       "This is an estimate based on the published eBay.ca fee schedule for 2026. Category rates vary, Store discounts differ by tier, and eBay adjusts its schedule periodically. Confirm the exact rate for your category on eBay.ca before pricing stock."],
    ],
  },
  uk: {
    body: `
    <p class="lead-sm">eBay UK runs two completely separate fee tracks, and which one you are on changes everything. Since October 2024, private sellers resident in the UK pay <b>no final value fee</b> on most categories. Business sellers pay a category rate plus a per-order charge, a regulatory operating fee, and 20% VAT on top of every fee.</p>
    <ul style="margin:10px 0 0 20px;font-size:14px;color:#475569">
      <li><b>Final value fee:</b> set by category, most major categories between 9.9% and 12.9% excluding VAT.</li>
      <li><b>Per-order fee:</b> 30p on orders of £10 or less, 40p on orders over £10.</li>
      <li><b>Regulatory operating fee:</b> 0.35% of the total sale.</li>
      <li><b>VAT:</b> 20% added to every fee above. Reclaimable if you are VAT-registered.</li>
      <li><b>International fee:</b> 1.05% to 2.0% depending on buyer region for business sellers; 3% for private sellers shipping overseas.</li>
      <li><b>Insertion fee:</b> free allowance each month, then 35p per listing.</li>
    </ul>`,
    items: [
      ["Do private sellers really pay nothing on eBay UK?",
       "For UK-resident private sellers, yes, on most categories — no final value fee and no regulatory operating fee when the item sells. Motors categories are excluded, and fees still apply if you exceed your monthly listing allowance, add optional upgrades, or deliver to an overseas address."],
      ["Does the fee apply to postage as well?",
       "Yes for business sellers. The final value fee is charged on the total amount the buyer pays, which includes the postage you charged. A £25 item with £4 postage is charged on £29."],
      ["Why is there a VAT line on my fees?",
       "eBay adds 20% VAT to every business fee — final value fee, per-order fee, regulatory fee and promoted listings. If you are VAT-registered you reclaim it on your return, so untick the VAT box to see your true cost. If you are not registered, it is a real 20% on top."],
      ["Does an eBay Shop subscription lower my fees in the UK?",
       "No. Unlike eBay US, a UK Shop subscription does not reduce your final value fee rate. Its value is in extra listing credits, storefront branding and Promotions Manager access."],
      ["How much does eBay UK take from a £30 sale?",
       "For a business seller in a 12.9% category including £3.50 postage: roughly £4.30 in fees including VAT, leaving about £29.20 before your item and postage costs. A UK private seller on the same sale keeps the full amount."],
      ["How accurate are these numbers?",
       "This is an estimate based on published eBay UK rates for 2026. Category rates vary, several changed in February 2026, and eBay updates its schedule periodically. Always confirm your exact rate on eBay.co.uk before pricing stock."],
    ],
  },
};

/* ---------- 构建 ---------- */
function build(site) {
  const cfgModule = R(`src/config/${site.cfg}.js`);
  const cfgObj = eval(
    "(function(){" +
      cfgModule.replace(/^\s*export\s+default\s+/m, "return ") +
      "})()"
  );
  const cfg = cfgObj;

  let html = TPL;
  const rep = (k, v) => { html = html.replaceAll(k, v); };

  rep("__LANG__", cfg.locale);
  rep("__TITLE__", site.title);
  rep("__DESC__", site.desc);
  rep("__CANONICAL__", site.domain);
  rep("__CUR__", cfg.currency);
  rep("__H1__", site.h1);
  rep("__SUB__", site.sub);
  rep("__UPDATED__", cfg.updated);
  rep("__SYM__", cfg.symbol);
  rep("__SHIPCH_LABEL__", cfg.copy.shipLabel);
  rep("__COST_LABEL__", cfg.copy.costLabel);
  rep("__SHIPCOST_LABEL__", cfg.copy.shipCostLabel);
  rep("__STORELABEL__", cfg.id === "uk" ? "Shop subscription" : "Store subscription");
  rep("__FAQH2__", site.faq);

  // 面包屑：回首页 + 同族工具快速切换
  rep("__HOMEURL__", BASE + "/");
  const siblings = SITES.filter((x) => x.cfg !== site.cfg);
  rep("__SWITCHER__", siblings.length
    ? `<span class="switch">${siblings
        .map((o) => `<a href="${o.domain}">${flagUse(o.cfg, 18)} ${o.h1.replace(/ eBay Fee Calculator/, "")}</a>`)
        .join("")}</span>`
    : "");

  // 费用上征收的税，两种形态由 config 决定渲染成哪种控件：
  //   feeTax   → 多档下拉（加拿大 GST/HST 按省 5%~15%）
  //   vatOnFees → 单一开关（英国 VAT 20%）
  rep("__FEETAXBOX__", cfg.feeTax
    ? `<div><label>Tax on eBay fees</label><select id="s_tax"></select>`
      + `<div class="hint">GST/HST applies to the fees themselves, not just the sale.</div></div>`
    : (cfg.vatOnFees
      ? `<div class="vat-box"><input type="checkbox" id="s_vat" checked>`
        + `<label for="s_vat" style="margin:0">Include ${cfg.vatOnFees.rate}% VAT on fees `
        + `<span class="hint">untick if you are VAT-registered</span></label></div>`
      : ""));

  // 反向定价区必须与正向用同一套开关，否则推出的价格预留不足
  rep("__RBIZBOX__", cfg.sellerTypes && cfg.sellerTypes.length > 1
    ? `<div><label>Seller type</label><select id="r_biz"></select></div>`
    : "");
  rep("__RVATBOX__", cfg.feeTax
    ? `<div><label>Tax on eBay fees</label><select id="r_tax"></select></div>`
    : (cfg.vatOnFees
      ? `<div><label>Include ${cfg.vatOnFees.rate}% VAT on fees</label>`
        + `<select id="r_vat"><option value="1">Yes</option>`
        + `<option value="0">No (VAT-registered)</option></select></div>`
      : ""));

  // 站点专属提示
  // 站点内链：让同族工具互相引流，形成内容集群
  const others = SITES.filter((x) => x.cfg !== site.cfg);
  rep("__CROSSLINKS__", others.length
    ? `<div class="card"><h2>Related calculators</h2><ul class="xlinks">${
        others.map((o) => `<li><a href="${o.domain}"><span class="flag">${flagUse(o.cfg, 26)}</span>${o.title.replace(/ —.*$/, "")}</a><span>${o.sub}</span></li>`).join("")
      }</ul></div>`
    : "");

  rep("__NOTES__", cfg.notes
    ? `<div class="site-notes"><h2>Things that catch UK sellers out</h2><ul>${cfg.notes.map((n) => `<li>${n}</li>`).join("")}</ul></div>`
    : "");

  // FAQ 正文
  const f = FAQ[site.cfg];
  const faqHtml = f.body +
    '<div style="margin-top:18px">' +
    f.items.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("") +
    "</div>";
  rep("__FAQBODY__", faqHtml);

  // 本页用到的国旗 symbol，只定义一次
  const need = [site.cfg, ...SITES.filter((x) => x.cfg !== site.cfg).map((x) => x.cfg)];
  rep("__FLAGDEFS__", flagDefs(need));

  rep("__GA__", gaSnippet() + (adsSnippet() ? "\n" + adsSnippet() : ""));
  rep("__CSS__", CSS);
  rep("__CONFIG__", `window.__CFG__ = ${JSON.stringify(cfg, null, 0)};`);
  rep("__APP__", APP_BUNDLE);
  rep("__BOOTSTRAP__", "");

  const dir = join(__dirname, "dist", site.slug);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "index.html");
  writeFileSync(out, html, "utf8");
  const kb = (Buffer.byteLength(html, "utf8") / 1024).toFixed(1);
  console.log(`✓ ${site.slug}/index.html  (${kb} KB)`);
}

/* ---------- 首页 / sitemap / robots ---------- */
function buildExtras() {
  const B = BASE;

  // 首页：导航到各工具，同时作为根路径兜底（避免根路径 404）
  const cards = SITES.map(
    (x) => `<li>`
      + `<a href="/${x.slug}"><span class="flag">${flagUse(x.cfg, 26)}</span>`
      + `${x.title.replace(/ —.*$/, "")}</a><span>${x.sub}</span></li>`
  ).join("");

  const index = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>eBay Fee Calculators — US, Canada &amp; UK</title>
<meta name="description" content="Free eBay fee calculators for US and UK sellers. Work out final value fees, per-order charges and your real net profit before you list.">
<link rel="canonical" href="${B}/">
${gaSnippet()}${adsSnippet() ? "\n" + adsSnippet() : ""}
<style>${R("src/ui/styles.css")}
.xlinks{list-style:none;margin:0;padding:0}
.xlinks li{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.xlinks li:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
.xlinks a{color:#0b5cad;font-weight:600;text-decoration:none;font-size:16px;
  display:flex;align-items:center;gap:9px}
.xlinks a:hover{text-decoration:underline}
.xlinks .flag{font-size:22px;line-height:1;flex:0 0 auto}
.xlinks li>span:not(.flag){display:block;font-size:13px;color:#64748b;margin-top:3px;padding-left:31px}
</style>
</head>
<body>
${flagDefs(SITES.map((x) => x.cfg))}
<header><h1>eBay Fee Calculators</h1><p>Work out what eBay takes and what you actually keep.</p></header>
<div class="wrap">
  <div class="card"><h2>Calculators</h2><ul class="xlinks">${cards}</ul></div>
</div>
</body>
</html>`;
  writeFileSync(join(__dirname, "dist", "index.html"), index, "utf8");
  console.log("✓ index.html");

  // sitemap.xml
  const urls = [`${B}/`, ...SITES.map((x) => `${B}/${x.slug}`)];
  const today = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${u === `${B}/` ? "1.0" : "0.9"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;
  writeFileSync(join(__dirname, "dist", "sitemap.xml"), sitemap, "utf8");
  console.log("✓ sitemap.xml");

  // ads.txt：AdSense 也认这个做站点验证，且是广告合规要求
  // 放在根目录，即 https://basakit.com/ads.txt
  // 未配置 AdSense 时移除上一轮可能残留的 ads.txt，避免产物与配置不一致
  if (!ADS_OK) {
    const p = join(__dirname, "dist", "ads.txt");
    if (existsSync(p)) rmSync(p);
  }
  if (ADS_OK) {
    const pubId = ADS.replace(/^ca-pub-/, "");
    writeFileSync(
      join(__dirname, "dist", "ads.txt"),
      `google.com, pub-${pubId}, DIRECT, f08c47fec0942fa0\n`,
      "utf8"
    );
    console.log("✓ ads.txt");
  }

  // robots.txt（指向 sitemap，便于 Google 抓取）
  writeFileSync(
    join(__dirname, "dist", "robots.txt"),
    `User-agent: *
Allow: /

Sitemap: ${B}/sitemap.xml
`,
    "utf8"
  );
  console.log("✓ robots.txt");
}

SITES.forEach(build);
buildExtras();
console.log("\ndist/ 已生成，可直接部署到 Cloudflare Pages。");
console.log(GA_OK ? `GA4 已注入：${GA_ID}` : "GA4 未注入（未设置 GA_ID）");
console.log(ADS_OK
  ? `AdSense 已注入：${ADS}（验证脚本 + ads.txt）`
  : "AdSense 未注入（未设置 ADSENSE_CLIENT）");
