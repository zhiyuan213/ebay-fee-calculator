/** 金额与百分比格式化 */

export function money(v, symbol = "$") {
  const n = Number(v) || 0;
  const s = Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (n < 0 ? "-" : "") + symbol + s;
}

export function pct(v, d = 1) {
  return (Number(v) || 0).toFixed(d) + "%";
}

export function isNeg(v) {
  return Number(v) < 0;
}

/** 表格行 */
export function row(label, value, cls = "") {
  return `<tr><td>${label}</td><td class="num ${cls}">${value}</td></tr>`;
}

export function sumRow(label, value, cls = "") {
  return `<tr class="sum"><td>${label}</td><td class="num ${cls}">${value}</td></tr>`;
}

export function kpi(value, label, cls = "") {
  return `<div class="kpi"><div class="v ${cls}">${value}</div><div class="l">${label}</div></div>`;
}

/** 导出 CSV */
export function toCSV(rows) {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
}

export function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
