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
  const file = path.join(__dirname, rel);
  console.log(`\n===== ${rel} =====`);
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('file://' + file);
  await page.waitForTimeout(300);

  check('无 JS 运行时错误', errors.length === 0, errors.join(' | ') || '无');

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
  check('类目下拉已填充', catCount >= 8, `${catCount} 项`);
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
  const isCA = rel.includes('/ca-');
  if (isUK) {
    const bizOpts = await page.$$eval('#s_biz option', (o) => o.map((x) => x.textContent));
    check('UK 有卖家类型', bizOpts.length === 2, bizOpts.join(' / '));
    check('UK 有 VAT 开关', (await page.$('#s_vat')) !== null);
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

  // 7.5 面包屑回首页
  const homeHref = await page.getAttribute('.crumb a', 'href');
  check('有回首页链接', !!homeHref && !/example\.com/.test(homeHref || '') || !!homeHref, homeHref || '无');
  const crumbText = await page.textContent('.crumb');
  check('面包屑含当前页名', crumbText.length > 5, crumbText.replace(/\s+/g, ' ').trim().slice(0, 60));

  // 8. 内链（矩阵集群）
  const xlinks = await page.$$eval('.xlinks a', (a) => a.map((x) => x.getAttribute('href')));
  check('有同族工具内链', xlinks.length >= 1, xlinks.join(' '));

  // 9. 无阻塞外部依赖
  const ext = await page.$$eval('script[src],link[rel="stylesheet"]',
    (e) => e.map((x) => x.getAttribute('src') || x.getAttribute('href')));
  check('无阻塞外部依赖', ext.length === 0, ext.join(',') || '无');

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
const sm = fs.readFileSync(path.join(__dirname, 'dist', 'sitemap.xml'), 'utf8');
check('sitemap 含全部页面', (sm.match(/<loc>/g) || []).length === 4, `${(sm.match(/<loc>/g) || []).length} 条`);

await browser.close();
console.log(fail === 0 ? '\n全部通过' : `\n${fail} 项失败`);
process.exit(fail ? 1 : 0);
