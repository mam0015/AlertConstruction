"use client";

import styles from "./owner.module.css";
import { smoothPath } from "./chart-utils";

type Row = { label: string; income: number; outcome: number };

const left = 56;
const right = 612;
const top = 34;
const bottom = 210;

function points(values: number[], max: number) {
  const step = values.length > 1 ? (right - left) / (values.length - 1) : 0;
  return values.map((value, index) => ({
    x: left + step * index,
    y: bottom - (value / max) * (bottom - top),
  }));
}

export default function BusinessPositionChart({ rows }: { rows: Row[] }) {
  const chartRows = rows.length ? rows : [{ label: "No entries", income: 0, outcome: 0 }];
  const max = Math.max(1, ...chartRows.flatMap((row) => [row.income, row.outcome]));
  const incomePoints = points(chartRows.map((row) => row.income), max);
  const outcomePoints = points(chartRows.map((row) => row.outcome), max);
  const incomePath = smoothPath(incomePoints);
  const outcomePath = smoothPath(outcomePoints);
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
      <path d={`${outcomePath} L ${right} ${bottom} L ${left} ${bottom} Z`} fill="url(#outcomeArea)" />
      <path d={`${incomePath} L ${right} ${bottom} L ${left} ${bottom} Z`} fill="url(#incomeArea)" />
      <path d={outcomePath} className={styles.outcomePath} />
      <path d={incomePath} className={styles.incomePath} filter="url(#lineGlow)" />
      {chartRows.map((row, index) => {
        const incomePoint = incomePoints[index];
        const outcomePoint = outcomePoints[index];
        return <g key={`${row.label}-${index}`}>
          <circle cx={outcomePoint.x} cy={outcomePoint.y} r="3.5" className={styles.outcomePoint}><title>{row.label} outcome: {formatter.format(row.outcome / 100)}</title></circle>
          <circle cx={incomePoint.x} cy={incomePoint.y} r="4" className={styles.incomePoint}><title>{row.label} income: {formatter.format(row.income / 100)}</title></circle>
          <text x={incomePoint.x} y="238" textAnchor="middle" className={styles.businessAxisLabel}>{row.label}</text>
        </g>;
      })}
    </svg>
    {!rows.length && <p className={styles.chartEmpty}>No finance entries yet. The chart will build itself from the records you add.</p>}
  </div>;
}
