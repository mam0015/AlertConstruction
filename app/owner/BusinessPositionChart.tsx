"use client";

import styles from "./owner.module.css";

type Row = { label: string; income: number; outcome: number };

function pathFor(values: number[], max: number) {
  const left = 56;
  const right = 612;
  const top = 34;
  const bottom = 210;
  const step = values.length > 1 ? (right - left) / (values.length - 1) : 0;
  return values.map((value, index) => {
    const x = left + step * index;
    const y = bottom - (value / max) * (bottom - top);
    return `${index ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

export default function BusinessPositionChart({ rows }: { rows: Row[] }) {
  const chartRows = rows.length ? rows : [{ label: "No entries", income: 0, outcome: 0 }];
  const max = Math.max(1, ...chartRows.flatMap((row) => [row.income, row.outcome]));
  const incomePath = pathFor(chartRows.map((row) => row.income), max);
  const outcomePath = pathFor(chartRows.map((row) => row.outcome), max);
  const net = chartRows.reduce((sum, row) => sum + row.income - row.outcome, 0);
  const formatter = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  return <div className={styles.businessChart}>
    <div className={styles.businessChartMeta}>
      <div><span>Recorded net movement</span><strong>{formatter.format(net / 100)}</strong></div>
      <div className={styles.businessLegend}><span><i />Income</span><span><i />Outcome</span></div>
    </div>
    <svg viewBox="0 0 660 250" role="img" aria-label="Recorded income and outcome by month">
      <defs>
        <linearGradient id="incomeArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f5c42e" stopOpacity=".32" />
          <stop offset="100%" stopColor="#f5c42e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="outcomeArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#778797" stopOpacity=".2" />
          <stop offset="100%" stopColor="#778797" stopOpacity="0" />
        </linearGradient>
        <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {[34, 78, 122, 166, 210].map((y) => <line key={y} x1="56" x2="612" y1={y} y2={y} className={styles.businessGridLine} />)}
      <path d={`${outcomePath} L 612 210 L 56 210 Z`} fill="url(#outcomeArea)" />
      <path d={`${incomePath} L 612 210 L 56 210 Z`} fill="url(#incomeArea)" />
      <path d={outcomePath} className={styles.outcomePath} />
      <path d={incomePath} className={styles.incomePath} filter="url(#lineGlow)" />
      {chartRows.map((row, index) => {
        const x = chartRows.length > 1 ? 56 + (556 / (chartRows.length - 1)) * index : 56;
        const y = 210 - (row.income / max) * 176;
        return <g key={`${row.label}-${index}`}>
          <circle cx={x} cy={y} r="4" className={styles.incomePoint}><title>{row.label}: {formatter.format(row.income / 100)}</title></circle>
          <text x={x} y="238" textAnchor="middle" className={styles.businessAxisLabel}>{row.label}</text>
        </g>;
      })}
    </svg>
    {!rows.length && <p className={styles.chartEmpty}>No finance entries yet. The chart will build itself from the records you add.</p>}
  </div>;
}
