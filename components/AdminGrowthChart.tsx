"use client";

import { useMemo, useState, type PointerEvent } from "react";
import type { GrowthPoint } from "@/lib/admin-dashboard.mjs";
import { formatAdminCalendarDay } from "@/lib/admin-date-format.mjs";

const WIDTH = 960;
const HEIGHT = 330;
const LEFT = 46;
const RIGHT = 18;
const TOP = 18;
const BOTTOM = 42;

function formatDay(day: string, compact = false) {
  return formatAdminCalendarDay(day, compact);
}

function periodLabel(point: GrowthPoint) {
  return point.startDay === point.day
    ? formatDay(point.day)
    : `${formatDay(point.startDay)}–${formatDay(point.day)}`;
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}

export function AdminGrowthChart({
  current,
  previous,
  compare,
  granularity
}: {
  current: GrowthPoint[];
  previous: GrowthPoint[];
  compare: boolean;
  granularity: "daily" | "weekly" | "monthly";
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const chart = useMemo(() => {
    const visible = compare ? [...current, ...previous] : current;
    const values = visible.map((point) => point.active);
    let minimum = values.length ? Math.min(...values) : 0;
    let maximum = values.length ? Math.max(...values) : 1;
    if (maximum === minimum) maximum = minimum + 1;
    const padding = Math.max(1, Math.ceil((maximum - minimum) * 0.08));
    minimum = Math.max(0, minimum - padding);
    maximum += padding;
    const plotWidth = WIDTH - LEFT - RIGHT;
    const plotHeight = HEIGHT - TOP - BOTTOM;
    const count = Math.max(current.length, previous.length, 1);
    const x = (index: number) => LEFT + (count <= 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
    const y = (value: number) => TOP + (1 - (value - minimum) / (maximum - minimum)) * plotHeight;
    const path = (points: GrowthPoint[]) => points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.active).toFixed(1)}`).join(" ");
    return { minimum, maximum, plotHeight, plotWidth, x, y, currentPath: path(current), previousPath: path(previous) };
  }, [compare, current, previous]);

  const index = selectedIndex === null ? Math.max(0, current.length - 1) : Math.min(selectedIndex, current.length - 1);
  const selected = current[index];
  const selectedPrevious = compare ? previous[index] : undefined;
  const labelIndexes = Array.from(new Set([0, Math.round((current.length - 1) / 3), Math.round(((current.length - 1) * 2) / 3), current.length - 1])).filter((value) => value >= 0);
  const showMarkers = current.length <= 31;

  function selectFromPointer(event: PointerEvent<SVGSVGElement>) {
    if (current.length <= 1) return setSelectedIndex(0);
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    setSelectedIndex(Math.round(ratio * (current.length - 1)));
  }

  return (
    <figure aria-labelledby="audience-growth-chart-title" className="mt-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <figcaption id="audience-growth-chart-title" className="text-xs font-semibold text-[#0b1d33]">
          Active subscriber history
        </figcaption>
        <div aria-label="Chart legend" className="flex flex-wrap items-center gap-4 text-[10px] text-muted">
          <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-0.5 w-6 bg-[#17304d]" />Current period</span>
          {compare ? <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="w-6 border-t-2 border-dashed border-[#a67c35]" />Previous period</span> : null}
        </div>
      </div>

      <div className="relative mt-3 rounded-lg border border-[#ded3c4] bg-[#fdfaf5] p-2 sm:p-3">
        {selected ? (
          <div
            role="status"
            aria-live="polite"
            className={`pointer-events-none absolute top-5 z-20 w-[min(260px,calc(100%-2rem))] rounded-md border border-[#cbb990] bg-[#fffdf8]/95 p-3 text-[10px] shadow-[0_10px_24px_rgba(11,29,51,0.12)] backdrop-blur ${index / Math.max(1, current.length - 1) > 0.68 ? "right-4" : "left-4"}`}
          >
            <p className="font-semibold text-[#0b1d33]">{periodLabel(selected)}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
              <dt className="text-muted">Active subscribers</dt><dd className="text-right font-semibold text-[#0b1d33]">{selected.active}</dd>
              <dt className="text-muted">New signups</dt><dd className="text-right font-semibold text-[#0b1d33]">{selected.signups}</dd>
              <dt className="text-muted">Unsubscribes</dt><dd className="text-right font-semibold text-[#0b1d33]">{selected.unsubscribes}</dd>
              <dt className="text-muted">Net growth</dt><dd className="text-right font-semibold text-[#0b1d33]">{signed(selected.netGrowth)}</dd>
            </dl>
            {selectedPrevious ? <p className="mt-2 border-t border-line pt-2 text-muted">Previous: <span className="font-semibold text-[#0b1d33]">{selectedPrevious.active} active</span> on {periodLabel(selectedPrevious)}</p> : null}
          </div>
        ) : null}

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`Active subscribers over the selected ${granularity} period${compare ? ", compared with the immediately preceding period" : ""}`}
          className="block h-[260px] w-full touch-pan-y sm:h-[330px]"
          preserveAspectRatio="none"
          onPointerMove={selectFromPointer}
          onPointerLeave={() => setSelectedIndex(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = TOP + ratio * chart.plotHeight;
            const value = Math.round(chart.maximum - ratio * (chart.maximum - chart.minimum));
            return <g key={ratio}><line x1={LEFT} x2={WIDTH - RIGHT} y1={y} y2={y} stroke="#e4dbcf" strokeWidth="1" /><text x={LEFT - 9} y={y + 4} textAnchor="end" fill="#776f67" fontSize="10">{value}</text></g>;
          })}
          {compare && chart.previousPath ? <path d={chart.previousPath} fill="none" stroke="#a67c35" strokeWidth="2.25" strokeDasharray="8 7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
          {chart.currentPath ? <path d={chart.currentPath} fill="none" stroke="#17304d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
          {current.map((point, pointIndex) => (
            <circle
              key={point.day}
              cx={chart.x(pointIndex)}
              cy={chart.y(point.active)}
              r={showMarkers || pointIndex === index ? 4 : 7}
              fill={showMarkers || pointIndex === index ? "#b68a3b" : "transparent"}
              stroke={pointIndex === index ? "#fffdf8" : "transparent"}
              strokeWidth="2"
              tabIndex={0}
              role="button"
              aria-label={`${periodLabel(point)}: ${point.active} active subscribers, ${point.signups} new signups, ${point.unsubscribes} unsubscribes, net growth ${signed(point.netGrowth)}`}
              onFocus={() => setSelectedIndex(pointIndex)}
              onBlur={() => setSelectedIndex(null)}
            />
          ))}
          {selected ? <line x1={chart.x(index)} x2={chart.x(index)} y1={TOP} y2={HEIGHT - BOTTOM} stroke="#8d8378" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" /> : null}
          {labelIndexes.map((labelIndex) => <text key={labelIndex} x={chart.x(labelIndex)} y={HEIGHT - 13} textAnchor={labelIndex === 0 ? "start" : labelIndex === current.length - 1 ? "end" : "middle"} fill="#776f67" fontSize="10">{formatDay(current[labelIndex]?.day ?? "", true)}</text>)}
        </svg>
      </div>

      <details className="mt-3 rounded-md border border-line bg-[#f8f2e9] px-3 py-2 text-xs">
        <summary className="cursor-pointer font-semibold text-[#0b1d33] focus:outline-none focus:ring-2 focus:ring-[#a67c35]/40">Accessible growth data</summary>
        <p className="mt-2 text-[10px] leading-4 text-muted">Reporting timezone: America/New_York. Zero-activity dates are retained so the timeline remains continuous.</p>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[10px]">
            <thead><tr className="border-b border-line"><th className="py-1.5 pr-4">Date</th><th className="py-1.5 pr-4">Active</th><th className="py-1.5 pr-4">New signups</th><th className="py-1.5 pr-4">Unsubscribes</th><th className="py-1.5">Net growth</th></tr></thead>
            <tbody>{current.map((point) => <tr key={point.day} className="border-b border-line/70"><td className="py-1.5 pr-4">{periodLabel(point)}</td><td className="py-1.5 pr-4">{point.active}</td><td className="py-1.5 pr-4">{point.signups}</td><td className="py-1.5 pr-4">{point.unsubscribes}</td><td className="py-1.5">{signed(point.netGrowth)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
