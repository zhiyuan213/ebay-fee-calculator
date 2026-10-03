/**
 * 静态页面：About / Privacy / Contact
 *
 * 为什么需要：
 *   Privacy  —— AdSense 强制要求；且站点装了 GA + AdSense，需说明数据处理方式
 *   Contact  —— AdSense 审核参考项；更实际的作用是让用户报告费率错误
 *   About    —— 补充站点实质内容，说明数据来源与更新机制
 *
 * 这些页面不放进 sitemap：sitemap 保持只有工具页，避免稀释
 */
export function buildStaticPages({ BASE, flagDefs, styles, GA, ADS, updated }) {
  const head = (title, desc, slug) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${BASE}/${slug}">
${GA}${ADS ? "\n" + ADS : ""}
<style>${styles}
.doc{max-width:760px;margin:0 auto;padding:0 16px}
.doc h1{font-size:26px;line-height:1.3;margin-bottom:10px}
.doc .lead{font-size:15px;color:#475569;margin-bottom:20px}
.doc h2{font-size:18px;margin:26px 0 10px;color:#084a8c}
.doc p,.doc li{font-size:14.5px;color:#334155;line-height:1.75}
.doc ul{margin:8px 0 0 20px}
.doc li{margin-bottom:8px}
.doc a{color:#0b5cad}
.doc .meta{font-size:13px;color:#64748b;margin-top:6px}
.contact-card{background:#fff;border-radius:12px;padding:22px;margin-top:16px;
  box-shadow:0 1px 3px rgba(16,24,40,.07);text-align:center}
.contact-card .mail{font-size:17px;font-weight:600;color:#084a8c;
  word-break:break-all;margin:10px 0}
.contact-card .note{font-size:13px;color:#64748b}
</style>
</head>
<body>
${flagDefs}
<header><h1>${title.replace(/ —.*$/, "")}</h1></header>
<div class="wrap"><div class="doc">`;

  const foot = (slug) => `
  <div class="backhome">
    <a href="${BASE}/"><span class="arrow">←</span><span>Back to all eBay fee calculators</span></a>
  </div>
</div></div>
<footer>
  <a href="${BASE}/about">About</a> ·
  <a href="${BASE}/privacy">Privacy</a> ·
  <a href="${BASE}/contact">Contact</a>
  <div style="margin-top:8px">Basakit · Free seller tools · No sign-up</div>
</footer>
</body>
</html>`;

  const pages = {};

  /* ---------- About ---------- */
  pages["about"] = {
    title: "About Basakit — Free eBay Fee Calculators",
    desc: "Who builds these eBay fee calculators, where the fee data comes from, how often it is updated, and what the calculators do and don't do.",
    slug: "about",
    body: `
<p class="lead">Basakit is a small set of free calculators for marketplace sellers. It exists because working out what a platform actually takes from a sale is harder than it should be.</p>

<h2>Why these exist</h2>
<p>Every marketplace takes a cut, but almost none of them show you the number you actually need: what lands in your bank account after fees, and whether the sale was worth making. eBay in particular charges several things at once — a percentage fee on the total the buyer pays including postage, a flat per-order charge, a regulatory fee in some countries, tax on the fees themselves in others, and extra percentages when the buyer is abroad.</p>
<p>On top of that, the rates are not the same between countries and they change. eBay UK changed its per-order fee and several category rates in February 2026. A calculator frozen at last year's numbers quietly gives you the wrong answer, which is worse than having no calculator at all.</p>

<h2>Where the numbers come from</h2>
<ul>
  <li>Each calculator is built from the fee schedule published by eBay for that country — eBay.com, eBay.ca and eBay.co.uk.</li>
  <li>Every page shows the date the rates were last reviewed, at the top of the page.</li>
  <li>Categories, store subscriptions, seller type and buyer location are all adjustable, because the rate depends on all four.</li>
</ul>
<p><strong>These are estimates, not invoices.</strong> Category rates vary, promotional offers and top-rated discounts apply to some sellers, and eBay adjusts its schedule periodically. Confirm the exact rate for your own category in Seller Hub before you price stock.</p>

<h2>What makes these different</h2>
<ul>
  <li><strong>Everything runs in your browser.</strong> The prices and costs you type in are never uploaded, never stored, and never seen by anyone. You can paste real numbers in.</li>
  <li><strong>Bulk mode.</strong> Paste a whole list of items and calculate them at once, then export to a spreadsheet — instead of typing one item at a time.</li>
  <li><strong>Reverse pricing.</strong> Start from the profit you need and work out the price you must list at. Because fees are a percentage of the sale, not of your costs, this has to be solved by division — adding your target profit to your costs and knocking off a rough percentage gives a price that is too low.</li>
  <li><strong>Country rules, not just currency.</strong> The Canadian calculator has no regulatory fee and a far lower international rate. The UK one handles private sellers paying nothing and VAT on top of fees. These are different rules, not a currency switch.</li>
</ul>

<h2>Who runs this</h2>
<p>One person. There is no sign-up, no account and no newsletter — partly because the calculators do not need one, and partly because a tool that works without an account is more useful than one that does not.</p>
<p class="meta">Fee rates last reviewed ${updated}.</p>`
  };

  /* ---------- Privacy ---------- */
  pages["privacy"] = {
    title: "Privacy Policy — Basakit",
    desc: "What Basakit does and does not collect. Calculator inputs never leave your browser. How Google Analytics and Google AdSense are used, and how to opt out.",
    slug: "privacy",
    body: `
<p class="lead">Short version: the numbers you type into a calculator never leave your device. Nothing you enter is uploaded, sent anywhere, or stored.</p>

<h2>Your calculator inputs</h2>
<p>Every calculator on this site runs entirely inside your web browser using JavaScript. When you enter a selling price, item cost or postage figure, the calculation happens on your own device.</p>
<ul>
  <li>We do not receive your figures.</li>
  <li>We do not store them.</li>
  <li>There is no account, so there is nothing to tie them to.</li>
  <li>Bulk lists you paste and CSV files you export stay on your device.</li>
</ul>
<p>This is a design choice rather than a courtesy: a fee calculator is only useful if you can put real costs into it.</p>

<h2>Analytics</h2>
<p>This site uses Google Analytics 4 to understand which calculators get used and where people leave. It sets cookies and records approximate location, device type and pages visited. It does not receive anything you type into a calculator.</p>
<p>You can block it with any browser privacy setting, an ad blocker, or Google's own opt-out browser add-on.</p>

<h2>Advertising</h2>
<p>This site may show advertising served by Google AdSense. Google and its partners use cookies — including the DoubleClick cookie — to serve ads based on your visits to this and other sites.</p>
<p>You can opt out of personalised advertising at any time via <a href="https://www.google.com/settings/ads" rel="nofollow noopener" target="_blank">Google Ads Settings</a>. Opting out does not remove ads; it stops them being tailored to you.</p>

<h2>What we know about you</h2>
<p>Very little. There is no registration, no contact form that stores data, no newsletter and no user database. If you email us, we have that email and whatever you chose to write.</p>

<h2>Links to other sites</h2>
<p>Pages link out to eBay's own seller pages for rate verification. We are not responsible for the privacy practices of sites we link to.</p>

<h2>Changes</h2>
<p>If this policy changes, the revised version will be posted on this page.</p>
<p class="meta">Last updated ${updated}.</p>`
  };

  /* ---------- Contact ---------- */
  pages["contact"] = {
    title: "Contact — Basakit",
    desc: "Report an incorrect fee rate, suggest a marketplace or country, or ask a question about the eBay fee calculators.",
    slug: "contact",
    body: `
<p class="lead">The most useful thing you can send is a fee rate that is wrong. These calculators depend on figures that change several times a year, and they are only any good if they are current.</p>

<div class="contact-card">
  <div style="font-size:14px;color:#475569">Email</div>
  <div class="mail" id="m"><span style="color:#64748b;font-weight:400">enable JavaScript to see the address</span></div>
  <div class="note">Shown this way to slow down address harvesting. </div>
</div>

<h2>Worth reporting</h2>
<ul>
  <li><strong>A rate that looks wrong.</strong> Tell us the country, category and what you expected. Screenshots of Seller Hub are ideal.</li>
  <li><strong>A category that is missing.</strong> Each calculator covers the main categories; if yours is not listed, say which one.</li>
  <li><strong>A country or marketplace you want.</strong> Requests tell us what to build next.</li>
  <li><strong>Something broken.</strong> Browser and device help enormously.</li>
</ul>

<h2>What we can't help with</h2>
<p>We cannot look into your eBay account, dispute a specific charge, or advise on tax. For an actual charge on a real sale, eBay's own Seller Hub is authoritative — these calculators are for planning prices before you list, not reconciling your statement afterwards.</p>

<h2>Response time</h2>
<p>This is a one-person project. Genuine rate errors are prioritised and usually corrected within a few days; everything else may take longer.</p>`
  };

  // 渲染
  const out = {};
  for (const [k, p] of Object.entries(pages)) {
    let html = head(p.title, p.desc, p.slug) + p.body + foot(p.slug);
    if (k === "contact") {
      // 邮箱用 JS 拼接，避免被爬虫直接抓走
      html = html.replace(
        '<div class="mail" id="m"><span style="color:#64748b;font-weight:400">enable JavaScript to see the address</span></div>',
        '<div class="mail" id="m"></div>'
      );
      html = html.replace("</body>", `<script>
(function(){
  var u="hello",d="basakit.com";
  var a=document.getElementById("m");
  if(!a)return;
  var addr=u+"@"+d;
  a.innerHTML='<a href="mailto:'+addr+'">'+addr+'</a>';
})();
</script>
</body>`);
    }
    out[k] = html;
  }
  return out;
}
