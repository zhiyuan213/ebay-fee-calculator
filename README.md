# eBay Fee Calculator

多站点 eBay 费用计算器。纯前端单文件静态页，零依赖、零后端、零服务器成本。

当前已生成：**US** 与 **UK** 两个站点。

---

## 快速开始

```bash
node build.mjs          # 构建，产物在 dist/
node verify.mjs         # 渲染与交互自检
```

产物是单文件 HTML，双击即可本地打开；也可直接拖进 Cloudflare Pages / Vercel 部署。

**部署前必须替换域名**（当前 canonical 是 `example.com` 占位）：

```bash
SITE_DOMAIN=https://yourdomain.com node build.mjs
```

---

## 目录结构

```
src/
  core/
    calc.js        计算核心，站点无关，所有差异由 config 驱动
    format.js      金额格式化与 CSV 导出
  config/
    us.js          美国站费率配置
    uk.js          英国站费率配置
  ui/
    app.js         交互逻辑，三种模式共用
    template.html  页面骨架
    styles.css     样式
build.mjs           零依赖构建脚本：注入 config → 替换模板 → 产出单文件
verify.mjs          jsdom 渲染自检
dist/               产物，可直接部署
```

## 接口说明

### 加一个新站点

**只改两个地方，`src/core/` 和 `src/ui/` 一行都不用动。**

1. 新建 `src/config/xx.js`，导出配置对象（字段见下）
2. 在 `build.mjs` 的 `SITES` 数组里加一行

### config 字段

| 字段 | 说明 |
|---|---|
| `id` / `name` / `symbol` / `currency` | 站点标识与币种符号 |
| `updated` | 费率更新日期，会渲染在页面上 |
| `categories` | 类目费率数组：`{ n, rate, above, cap }`，`above`/`cap` 为 `null` 表示不分档 |
| `perOrder` | `{ threshold, atOrBelow, above }` 每单固定费，两国方向相反由配置表达 |
| `regulatory` | 监管运营费 `{ rate, label }` |
| `international` | 国际费 `{ label, bands, privateRate }` |
| `storeOptions` / `insertOptions` | 店铺、插入费下拉选项 |
| `privateZeroFee` | 私人卖家是否免 FVF（英国为 `true`） |
| `vatOnFees` | 费用上的增值税（英国 20%），不设则无此控件 |
| `sellerTypes` / `defaultBusiness` | 卖家类型选项与默认值 |
| `copy` | 站点文案差异（英国用 postage，美国用 shipping） |
| `notes` | 站点专属提示，渲染为独立区块 |

### 核心函数

```js
calc(cfg, input)         // 算单笔：返回各项费用、payout、profit、margin、roi、breakeven
reversePrice(cfg, input) // 反向定价：已知成本与目标利润，反推应标售价
```

`calc` 返回字段：`subtotal, fvf, perOrder, regulatory, intl, promoted, insertion, vat, totalFees, payout, profit, margin, roi, effRate, breakeven, ratePct`

---

## 功能

- **单件计算** — 逐项费用拆解、净利润、利润率、ROI、盈亏平衡价
- **批量计算** — 粘贴多行，一次算完，支持 CSV 导出
- **反向定价** — 给定目标利润反推售价（按售价抽成，必须做除法）

---

## 费率口径

⚠ **上线前请到 eBay 官方 Seller Hub 核对**，以下为公开资料整理，部分类目各来源说法不一致。

**US**：默认 13.25%（$7,500 以上部分 2.35%）+ 每单 $0.30（<$10 为 $0.40）+ 监管费 0.35%（仅商业卖家）+ 国际 1.65%

**UK**：默认 12.9% + 每单 £0.30（>£10 为 £0.40）+ 监管费 0.35% + 费用加 20% VAT
英国居民私人卖家自 2024-10 起 FVF 与监管费均为 0（汽车类除外）

---

## 自检

`node verify.mjs` 会校验：三种模式渲染、输入联动、类目切换、批量结果、反向定价回算、SEO 要素、无外部依赖。

反向定价一项是**回算校验**——用反推出的价格重新正向计算，利润必须精确等于目标值。这一项能同时抓出公式错误与开关不一致。
