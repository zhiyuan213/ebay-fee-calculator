import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import fs from 'fs';

const files = [
  'dist/us-ebay-fee-calculator.html',
  'dist/uk-ebay-fee-calculator.html'
];

let fail = 0;
const check = (name, cond, detail='') => {
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${detail ? ' -> ' + detail : ''}`);
  if (!cond) fail++;
};

for (const f of files) {
  console.log(`\n===== ${f} =====`);
  const html = fs.readFileSync(f, 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  const { window } = dom;
  const doc = window.document;

  // 1. 单件模式默认渲染
  const res = doc.getElementById('s_res');
  check('单件结果区已渲染', res && res.innerHTML.length > 100, `${res?.innerHTML.length || 0} 字符`);
  const kpis = res ? [...res.querySelectorAll('.kpi .v')].map(e => e.textContent) : [];
  check('四个 KPI 均有值', kpis.length === 4, kpis.join(' | '));
  check('KPI 无 NaN/undefined', kpis.every(v => !/NaN|undefined/.test(v)), kpis.join(' | '));

  // 2. 输入联动
  const priceEl = doc.getElementById('s_price');
  const before = res.innerHTML;
  if (priceEl) {
    priceEl.value = '200';
    priceEl.dispatchEvent(new window.Event('input'));
    check('改价格后结果刷新', res.innerHTML !== before);
  }

  // 3. 类目切换
  const catEl = doc.getElementById('s_cat');
  check('类目下拉已填充', catEl && catEl.options.length >= 8, `${catEl?.options.length || 0} 项`);
  if (catEl && catEl.options.length > 1) {
    catEl.selectedIndex = 1;
    catEl.dispatchEvent(new window.Event('change'));
    check('切换类目后结果刷新', !/NaN/.test(res.innerHTML));
  }

  // 4. 批量模式
  const bulkBtn = [...doc.querySelectorAll('button.act')].find(b => /Calculate all/i.test(b.textContent));
  const bres = doc.getElementById('b_res');
  if (bulkBtn) {
    bulkBtn.click();
    const rows = bres ? bres.querySelectorAll('tr').length : 0;
    check('批量模式算出结果', rows >= 5, `${rows} 行（含表头合计）`);
    check('批量结果无 NaN', !/NaN|undefined/.test(bres.innerHTML));
  }

  // 5. 反向定价
  const revBtn = [...doc.querySelectorAll('button.act')].find(b => /required price/i.test(b.textContent));
  const rres = doc.getElementById('r_res');
  if (revBtn) {
    revBtn.click();
    const v = rres ? [...rres.querySelectorAll('.kpi .v')].map(e => e.textContent) : [];
    check('反向定价渲染', v.length === 4, v.join(' | '));
    check('反向定价无 NaN', v.every(x => !/NaN|undefined/.test(x)), v.join(' | '));
  }

  // 6. 站点专属元素
  if (f.includes('uk-')) {
    check('UK 有卖家类型选项', !!doc.getElementById('s_biz'), 's_biz: ' + [...(doc.getElementById('s_biz')?.options||[])].map(o=>o.text).join(' / '));
    check('UK 有 VAT 开关', !!doc.getElementById('s_vat'));
    check('UK 有国际地区选项', !!doc.getElementById('s_intl'));
    check('UK 币种为英镑', html.includes('£') && /GBP|£/.test(doc.querySelector('h1')?.textContent + html.slice(0, 4000)));
  } else {
    check('US 有买家所在地选项', !!doc.getElementById('s_intl'));
    check('US 币种为美元', html.includes('$'));
  }

  // 7. SEO 要素
  check('有 title', !!doc.querySelector('title')?.textContent.trim());
  check('有 meta description', !!doc.querySelector('meta[name="description"]')?.content);
  check('有 h1', !!doc.querySelector('h1')?.textContent.trim());
  check('有 h2 正文区', doc.querySelectorAll('h2').length >= 1);
  check('有 FAQ details', doc.querySelectorAll('details').length >= 3, `${doc.querySelectorAll('details').length} 条`);
  check('有费率更新日期', /updated|reviewed/i.test(html));

  // 8. 无外链请求（纯前端自包含）
  // 真正阻塞渲染的外部依赖（script src / stylesheet）必须为空；canonical 只是占位待替换
  const blocking = [...doc.querySelectorAll('script[src],link[rel="stylesheet"]')]
    .map(e => e.getAttribute('src') || e.getAttribute('href'));
  check('无阻塞渲染的外部依赖', blocking.length === 0, blocking.join(',') || '无');
  const canon = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
  const canonPlaceholder = /example\.com/.test(canon);
  console.log(`  ${canonPlaceholder ? 'WARN' : 'INFO'}  canonical 域名 ${canonPlaceholder ? '仍为占位 example.com，部署前需替换为真实域名' : '已配置 -> ' + canon}`);
}

console.log(fail === 0 ? '\n全部通过' : `\n${fail} 项失败`);
process.exit(fail ? 1 : 0);
