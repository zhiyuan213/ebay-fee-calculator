/**
 * 内联 SVG 国旗
 *
 * 为什么用 SVG 而不是 emoji：Windows 字体不支持 regional indicator，
 * emoji 国旗在 Windows 上会退化成 "US"/"CA"/"GB" 字母方块。
 * 为什么用 SVG 而不是图片：零外部请求、可任意缩放、不增加网络往返。
 *
 * 体积优化：每页顶部用 <symbol> 定义一次，所有位置用 <use> 引用。
 * 美国旗有 50 颗星，若每处都内联，一个页面会重复 2~3 次、多出十几 KB。
 */

/* 站点 id → 国旗 id（配置里是 uk，旗子是 gb） */
const ALIAS = { uk: "gb", gb: "gb", us: "us", ca: "ca" };

/* 五角星路径 */
function star(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.382;
    pts.push(
      (cx + rr * Math.cos(rad)).toFixed(1) + "," + (cy + rr * Math.sin(rad)).toFixed(1)
    );
  }
  return "M" + pts.join("L") + "Z";
}

/* 美国：13 条纹 + 蓝底 50 星（9 行，6/5 交替） */
function usFlag() {
  const W = 190, H = 100;
  const C = 76, D = (7 * H) / 13;
  const stripe = H / 13;
  let s = `<rect width="${W}" height="${H}" fill="#fff"/>`;
  for (let i = 0; i < 13; i += 2) {
    s += `<rect y="${(i * stripe).toFixed(1)}" width="${W}" height="${stripe.toFixed(1)}" fill="#b22234"/>`;
  }
  s += `<rect width="${C}" height="${D.toFixed(1)}" fill="#3c3b6e"/>`;
  const r = 3.6;
  const my = D * 0.075, mx = C * 0.075;
  const vy = (D - 2 * my) / 8, vx = (C - 2 * mx) / 10;
  for (let row = 0; row < 9; row++) {
    const cy = my + row * vy;
    const cols = row % 2 === 0 ? 6 : 5;
    for (let k = 0; k < cols; k++) {
      const col = row % 2 === 0 ? k * 2 : k * 2 + 1;
      s += `<path d="${star(mx + col * vx, cy, r)}" fill="#fff"/>`;
    }
  }
  return s;
}

/* 加拿大：红-白-红 + 枫叶 */
function caFlag() {
  // 11 尖枫叶，对称多边形，定义在 24x24 内（x 关于 12 对称，y 1.5~22.6）
  const LEAF = [
    "M12 1.5",
    "L14.6 5.2 13.2 6.4",
    "L18.2 7.6 15.2 10",
    "L20.4 11.4 15.6 13",
    "L18 16.6 14.4 17",
    "L13 20.4 12.8 22.6",
    "L11.2 22.6 11 20.4",
    "L9.6 17 6 16.6",
    "L8.4 13 3.6 11.4",
    "L8.8 10 5.8 7.6",
    "L10.8 6.4 9.4 5.2",
    "Z",
  ].join(" ");
  // 枫叶中心 (12, 12.05) 对齐旗面中心 (60, 30)
  return (
    `<rect width="120" height="60" fill="#fff"/>` +
    `<rect width="30" height="60" fill="#d80621"/>` +
    `<rect x="90" width="30" height="60" fill="#d80621"/>` +
    `<g transform="translate(60 30) scale(2.05) translate(-12 -12.05)">` +
    `<path d="${LEAF}" fill="#d80621"/></g>`
  );
}

/* 英国：蓝底 + 白/红对角十字 + 白/红正十字 */
function gbFlag() {
  const W = 60, H = 30;
  const d1 = `M0 0L${W} ${H}`, d2 = `M${W} 0L0 ${H}`;
  const cross = `M${W / 2} 0V${H}M0 ${H / 2}H${W}`;
  return [
    `<rect width="${W}" height="${H}" fill="#012169"/>`,
    `<path d="${d1}" stroke="#fff" stroke-width="6" fill="none"/>`,
    `<path d="${d2}" stroke="#fff" stroke-width="6" fill="none"/>`,
    `<path d="${d1}" stroke="#c8102e" stroke-width="3" fill="none" transform="translate(0.9 0.5)"/>`,
    `<path d="${d2}" stroke="#c8102e" stroke-width="3" fill="none" transform="translate(-0.9 0.5)"/>`,
    `<path d="${cross}" stroke="#fff" stroke-width="10" fill="none"/>`,
    `<path d="${cross}" stroke="#c8102e" stroke-width="6" fill="none"/>`,
  ].join("");
}

const VB = { us: "0 0 190 100", ca: "0 0 120 60", gb: "0 0 60 30" };
const RATIO = { us: 100 / 190, ca: 60 / 120, gb: 30 / 60 };
const BODY = { us: usFlag, ca: caFlag, gb: gbFlag };

const resolve = (id) => ALIAS[id] || (BODY[id] ? id : "us");

/**
 * 页面顶部注入一次的 <defs>。传入本页要用到的站点 id 列表。
 * @param {string[]} ids
 */
export function flagDefs(ids) {
  const uniq = [...new Set(ids.map(resolve))];
  if (!uniq.length) return "";
  const symbols = uniq
    .map((k) => `<symbol id="flag-${k}" viewBox="${VB[k]}">${BODY[k]()}</symbol>`)
    .join("");
  return `<svg class="flag-defs" aria-hidden="true" focusable="false" `
    + `style="position:absolute;width:0;height:0;overflow:hidden">${symbols}</svg>`;
}

/**
 * 引用处。每处只有一个 <use>，体积可忽略。
 * @param {string} id  us | ca | uk
 * @param {number} size 显示宽度 px
 */
export function flagUse(id, size = 26) {
  const k = resolve(id);
  const h = +(size * RATIO[k]).toFixed(1);
  return `<svg class="flag flag-svg" viewBox="${VB[k]}" width="${size}" height="${h}" `
    + `aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">`
    + `<use href="#flag-${k}"/></svg>`;
}
