/**
 * 真实浏览器自检（Playwright + Chromium）
 * 用 file:// 直接打开构建产物，检查渲染、交互、反向定价回算与 SEO 要素
 *
 *   node build.mjs && node verify.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/usr/local/lib/node_modules/playwright'));
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const files = [
  'dist/us-ebay-fee-calculator/index.html',
  'dist/ca-ebay-fee-calculator/index.html',
  'dist/au-ebay-fee-calculator/index.html',
  'dist/etsy-fee-calculator/index.html',
  'dist/uk-ebay-fee-calculator/index.html',
];

let fail = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${detail ? ' -> ' + detail : ''}`);
  if (!cond) fail++;
};

// 用系统已装的 Chrome/Chromium，避免下载浏览器
const EXEC = ['/usr/bin/google-chrome', '/usr/local/bin/chromium', '/usr/bin/chromium']
  .find((p) => fs.existsSync(p));
const browser = await chromium.launch({
  executablePath: EXEC,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

for (const rel of files) {
  const isCA = rel.includes('/ca-');
  const isAU = rel.includes('/au-');
  const isEtsy = rel.includes('/etsy-');
  const file = path.join(__dirname, rel);
  console.log(`\n===== ${rel} =====`);
  const page = await browser.newPage();

  const errors = [];
  const netNoise = [];
  // 第三方脚本（GA / AdSense）在本地 file:// 下必然加载失败，
  // 且未授权的 AdSense client 会被 CORS 拒绝 —— 这类不算页面缺陷
  const isThirdParty = (t) => /googletagmanager|gtag|pagead2|adsbygoogle|CORS|ERR_FAILED|net::/.test(t);
  page.on('pageerror', (e) => (isThirdParty(String(e)) ? netNoise : errors).push(String(e)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    (isThirdParty(m.text()) ? netNoise : errors).push(m.text());
  });

  await page.goto('file://' + file);
  await page.waitForTimeout(300);

  check('无 JS 运行时错误', errors.length === 0, errors.join(' | ') || '无');
  if (netNoise.length) {
    console.log(`  INFO  ${netNoise.length} 条第三方脚本告警（本地 file:// 下的预期现象，线上无此问题）`);
  }

  // 1. 单件模式
  const kpis = await page.$$eval('#s_res .kpi .v', (els) => els.map((e) => e.textContent));
  check('单件四个 KPI 有值', kpis.length === 4, kpis.join(' | '));
  check('KPI 无 NaN/Infinity', kpis.every((v) => v && !/NaN|Infinity|undefined/.test(v)), kpis.join(' | '));

  // 2. 改价格联动
  const before = await page.innerHTML('#s_res');
  await page.fill('#s_price', '200');
  await page.waitForTimeout(150);
  const after = await page.innerHTML('#s_res');
  check('改价格后结果刷新', before !== after);

  // 3. 类目切换
  const catCount = await page.$$eval('#s_cat option', (o) => o.length);
  check('类目下拉已填充', isEtsy ? catCount >= 2 : catCount >= 5, `${catCount} 项`);
  await page.selectOption('#s_cat', '1');
  await page.waitForTimeout(150);
  check('切换类目无 NaN', !/NaN/.test(await page.innerHTML('#s_res')));

  // 4. 批量模式
  await page.click('.tab[data-t="bulk"]');
  await page.click('button.act:has-text("Calculate all")');
  await page.waitForTimeout(200);
  const rows = await page.$$eval('#b_res tr', (r) => r.length);
  check('批量模式出结果', rows >= 5, `${rows} 行`);
  check('批量无 NaN', !/NaN|undefined/.test(await page.innerHTML('#b_res')));

  // 5. 反向定价 + 回算校验（最关键：反推价格后正向验算，利润必须等于目标）
  await page.click('.tab[data-t="reverse"]');
  await page.waitForTimeout(200);
  await page.click('button.act:has-text("Calculate required price")');
  await page.waitForTimeout(200);
  const revKpi = await page.$$eval('#r_res .kpi .v', (els) => els.map((e) => e.textContent));
  check('反向定价渲染', revKpi.length === 4, revKpi.join(' | '));

  const parseMoney = (s) => parseFloat(String(s).replace(/[^0-9.-]/g, ''));
  const target = parseMoney(await page.inputValue('#r_target'));
  const actual = parseMoney(revKpi[3]);
  check('反向定价回算利润 == 目标', Math.abs(actual - target) < 0.02,
    `目标 ${target} / 实算 ${actual}`);

  // 6. 站点专属
  const isUK = rel.includes('/uk-');
  if (isUK) {
    const bizOpts = await page.$$eval('#s_biz option', (o) => o.map((x) => x.textContent));
    check('UK 有卖家类型', bizOpts.length === 2, bizOpts.join(' / '));
    check('UK 有 VAT 开关', (await page.$('#s_vat')) !== null);
  }
  if (isEtsy) {
    await page.click('.tab[data-t="single"]');
    await page.waitForTimeout(150);
    const ads = await page.$$eval('#s_ads option', (o) => o.length);
    check('Etsy 有站外广告下拉', ads >= 3, `${ads} 档`);
    check('Etsy 有销售税输入', (await page.$('#s_taxpct')) !== null);
    check('Etsy 无 seller type 下拉', (await page.$('#s_biz')) === null);
    const h = await page.innerHTML('#s_res');
    check('Etsy 显示支付处理费', /Payment processing/i.test(h));
    // 站外广告封顶 $100
    await page.fill('#s_price', '2000');
    await page.selectOption('#s_ads', '2');
    await page.waitForTimeout(200);
    const h2 = await page.innerHTML('#s_res');
    check('Etsy 站外广告封顶 $100', /100\.00/.test(h2));
    await page.fill('#s_price', '50');
    await page.selectOption('#s_ads', '0');
    await page.waitForTimeout(150);
  }
  // 平台术语一致性：串台的术语肉眼看不出来 —— 下拉框照样渲染、照样能选，
  // 只是语义全错（Etsy 站显示 "Promoted Listings"、eBay 站显示 "Offsite Ads"）。
  // 只有显式比对词表才抓得住。范围限定在三个 tab，避免命中底部同族内链。
  if (isEtsy || /\/(us|ca|au|uk)-/.test(rel)) {
    const formText = await page.evaluate(() =>
      ['t-single', 't-bulk', 't-reverse']
        .map((i) => document.getElementById(i)?.textContent || '').join('\n'));
    if (isEtsy) {
      const bad = ['eBay', 'Promoted Listings', 'Insertion fee', 'Final value fee',
                   'Per-order fee', 'Store subscription', 'Seller type', 'Buyer location']
        .filter((w) => formText.includes(w));
      check('Etsy 站无 eBay 术语', bad.length === 0, bad.join(', ') || '无');
      const miss = ['Transaction fee', 'Payment processing', 'Listing fee', 'Offsite Ads']
        .filter((w) => !formText.includes(w));
      check('Etsy 站有 Etsy 术语', miss.length === 0, miss.join(', ') || '齐全');
    } else {
      const bad = ['Etsy', 'Offsite Ads', 'Listing fee', 'Listing category',
                   'Payment processing', 'Transaction fee'].filter((w) => formText.includes(w));
      check('eBay 站无 Etsy 术语', bad.length === 0, bad.join(', ') || '无');
      const miss = ['Final value fee', 'Per-order fee', 'Promoted Listings', 'Insertion fee']
        .filter((w) => !formText.includes(w));
      check('eBay 站有 eBay 术语', miss.length === 0, miss.join(', ') || '齐全');
    }
  }
  if (isAU) {
    await page.click('.tab[data-t="single"]');
    await page.waitForTimeout(150);
    const plans = await page.$$eval('#s_store option', (o) => o.length);
    check('AU 有 Pro 计划下拉', plans >= 5, `${plans} 档`);
    const gst = await page.$$eval('#s_gst option', (o) => o.length);
    check('AU 有 GST 选项', gst >= 2, `${gst} 档`);
    // 免费销售：交易费为 0，但每单费照收
    await page.selectOption('#s_store', '0');
    await page.waitForTimeout(150);
    const h = await page.innerHTML('#s_res');
    check('AU 免费销售仍收每单费', /0\.30/.test(h), 'FVF 应为 0');
    await page.selectOption('#s_store', '1');
    await page.waitForTimeout(150);
    // ABN 注册：GST 应可省
    await page.selectOption('#s_gst', '1');
    await page.waitForTimeout(150);
    const h2 = await page.innerHTML('#s_res');
    check('AU 切换 GST 后有抵扣行', /GST/i.test(h2));
  }
  if (isCA) {
    // 前面已切到 reverse 页签，需先切回 single 才能操作单件控件
    await page.click('.tab[data-t="single"]');
    await page.waitForTimeout(150);
    const taxOpts = await page.$$eval('#s_tax option', (o) => o.length);
    check('CA 有省份税率下拉', taxOpts >= 5, `${taxOpts} 档`);
    // 切到安省 13%，费用税行必须出现
    await page.selectOption('#s_tax', '3');
    await page.waitForTimeout(150);
    const html = await page.innerHTML('#s_res');
    check('CA 切换省份后费用税生效', /Tax on eBay fees|GST\/HST/.test(html));
  }
  const bodyHtml = await page.innerHTML('body');
  check('币种符号正确', bodyHtml.includes(isUK ? '£' : '$'), isUK ? '£' : '$');

  // 7. SEO 要素
  check('有 title', !!(await page.title()));
  check('有 meta description', !!(await page.getAttribute('meta[name="description"]', 'content')));
  check('有 h1', !!(await page.textContent('h1'))?.trim());
  const faqCount = await page.$$eval('details', (d) => d.length);
  check('FAQ >= 3 条', faqCount >= 3, `${faqCount} 条`);
  check('有费率更新日期', /updated|reviewed/i.test(bodyHtml));

  // 7.5 回首页入口：面包屑 + 底部按钮，两处都必须存在且指向首页
  const homeHref = await page.getAttribute('.crumb a', 'href');
  check('面包屑有回首页链接', !!homeHref, homeHref || '无');
  const crumbText = await page.textContent('.crumb');
  check('面包屑含当前页名', crumbText.length > 5, crumbText.replace(/\s+/g, ' ').trim().slice(0, 60));

  const backBtn = await page.$('.backhome a');
  check('底部有回首页按钮', backBtn !== null);
  if (backBtn) {
    const href = await backBtn.getAttribute('href');
    const txt = (await backBtn.textContent()).replace(/\s+/g, ' ').trim();
    check('底部按钮指向首页', /\/$/.test(href || ''), href || '无');
    check('底部按钮文案可读', txt.length > 5, txt);
    // 链接必须真的能点（不能是 # 或空）
    check('底部按钮 href 有效', !!href && href !== '#', href || '无');
  }

  // 7.6 页脚 About / Privacy / Contact —— AdSense 审核会看
  const footLinks = await page.$$eval('footer a', (a) =>
    a.map((x) => ({ t: x.textContent.trim(), h: x.getAttribute('href') })));
  const need = ['About', 'Privacy', 'Contact'];
  for (const n of need) {
    const hit = footLinks.find((l) => l.t === n);
    check(`页脚有 ${n} 链接`, !!hit && !!hit.h && hit.h !== '#', hit ? hit.h : '无');
  }

  // 8. 内链（矩阵集群）
  const xlinks = await page.$$eval('.xlinks a', (a) => a.map((x) => x.getAttribute('href')));
  check('有同族工具内链', xlinks.length >= 1, xlinks.join(' '));

  // 9. 外部依赖：除 GA 的 async 脚本外不应有任何阻塞渲染的资源
  const all = await page.$$eval('script[src],link[rel="stylesheet"]',
    (e) => e.map((x) => ({
      u: x.getAttribute('src') || x.getAttribute('href'),
      async: x.hasAttribute('async') || x.hasAttribute('defer'),
    })));
  const blocking = all.filter((x) => !x.async).map((x) => x.u);
  check('无阻塞渲染的外部依赖', blocking.length === 0, blocking.join(',') || '无');

  const ga = all.filter((x) => /googletagmanager|gtag/.test(x.u || ''));
  if (ga.length) {
    check('GA 脚本为 async 加载', ga.every((x) => x.async), `${ga.length} 个`);
    const id = await page.evaluate(() => {
      const m = document.documentElement.innerHTML.match(/gtag\('config',\s*'([^']+)'\)/);
      return m ? m[1] : null;
    });
    check('GA config ID 正确', id === 'G-9TH6Q9RFEV', id || '未找到');
  } else {
    console.log('  INFO  未注入 GA（本次构建未设置 GA_ID）');
  }

  // 9.5 AdSense：验证脚本必须 async，且不能是同步阻塞
  const ads = all.filter((x) => /pagead2|adsbygoogle/.test(x.u || ''));
  if (ads.length) {
    check('AdSense 脚本为 async 加载', ads.every((x) => x.async), `${ads.length} 个`);
    const cli = await page.evaluate(() => {
      const m = document.documentElement.innerHTML.match(/adsbygoogle\.js\?client=(ca-pub-\d+)/);
      return m ? m[1] : null;
    });
    check('AdSense client ID 正确', cli === 'ca-pub-1590351261982793', cli || '未找到');
  } else {
    console.log('  INFO  未注入 AdSense（本次构建未设置 ADSENSE_CLIENT）');
  }

  const canon = (await page.getAttribute('link[rel="canonical"]', 'href')) || '';
  if (/example\.com/.test(canon)) {
    console.log('  WARN  canonical 仍为 example.com 占位，部署前用 SITE_DOMAIN 注入真实域名');
  } else {
    console.log(`  INFO  canonical -> ${canon}`);
  }

  await page.close();
}

// 静态资源
console.log('\n===== dist 静态资源 =====');
for (const f of ['index.html', 'sitemap.xml', 'robots.txt']) {
  check(`存在 ${f}`, fs.existsSync(path.join(__dirname, 'dist', f)));
}
// 静态页：About / Privacy / Contact
const DOCS = [
  { slug: 'about', must: ['About', 'eBay'], noGa: false },
  { slug: 'privacy', must: ['Privacy', 'Google Analytics', 'AdSense'], noGa: false },
  { slug: 'contact', must: ['Contact'], noGa: false },
];
for (const d of DOCS) {
  const fp = path.join(__dirname, 'dist', d.slug, 'index.html');
  if (!fs.existsSync(fp)) { check(`存在 ${d.slug} 页`, false, '未生成'); continue; }
  check(`存在 ${d.slug} 页`, true);
  const dp = await browser.newPage();
  const errs = [];
  dp.on('pageerror', (e) => errs.push(String(e)));
  await dp.goto('file://' + fp);
  await dp.waitForTimeout(250);
  const txt = await dp.textContent('body');
  check(`${d.slug} 含关键内容`, d.must.every((m) => txt.includes(m)),
    d.must.filter((m) => !txt.includes(m)).join(',') || '齐全');
  check(`${d.slug} 无 JS 错误`, errs.length === 0, errs.join('|') || '无');
  const back = await dp.$('.backhome a');
  check(`${d.slug} 有回首页入口`, back !== null);
  await dp.close();
}

// contact 页邮箱必须由 JS 渲染（防爬虫），且渲染后确实存在
{
  const fp = path.join(__dirname, 'dist', 'contact', 'index.html');
  if (fs.existsSync(fp)) {
    const raw = fs.readFileSync(fp, 'utf8');
    check('contact 邮箱未硬编码在 HTML 中（防抓取）', !/[a-z0-9._-]+@basakit\.com/.test(raw));
    const cp = await browser.newPage();
    await cp.goto('file://' + fp);
    await cp.waitForTimeout(300);
    const mail = await cp.textContent('#m');
    check('contact 邮箱 JS 渲染后可见', /@basakit\.com/.test(mail || ''), (mail || '').trim());
    await cp.close();
  }
}

// ads.txt：AdSense 站点验证与广告合规都需要，且必须在根路径
const adsTxtPath = path.join(__dirname, 'dist', 'ads.txt');
if (fs.existsSync(adsTxtPath)) {
  const at = fs.readFileSync(adsTxtPath, 'utf8').trim();
  check('ads.txt 格式正确', /^google\.com,\s*pub-\d+,\s*DIRECT,\s*[a-f0-9]{16}$/.test(at), at);
} else {
  console.log('  INFO  未生成 ads.txt（未设置 ADSENSE_CLIENT）');
}

const sm = fs.readFileSync(path.join(__dirname, 'dist', 'sitemap.xml'), 'utf8');
check('sitemap 含全部页面', (sm.match(/<loc>/g) || []).length === 6, `${(sm.match(/<loc>/g) || []).length} 条`);

await browser.close();
console.log(fail === 0 ? '\n全部通过' : `\n${fail} 项失败`);
process.exit(fail ? 1 : 0);
