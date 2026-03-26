"use client";

import { cn } from "@/lib/utils";

type DataPoint = {
  label: string;
  userReturn: number;
  ibovReturn: number;
};

export function PerformanceChart({ data }: { data: DataPoint[] }) {
  if (data.length < 2) return null;

  const W = 600;
  const H = 200;
  const PX = 48; // padding x
  const PY = 24; // padding y
  const chartW = W - PX * 2;
  const chartH = H - PY * 2;

  const allValues = data.flatMap((d) => [d.userReturn, d.ibovReturn]);
  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 0);
  const range = maxVal - minVal || 0.01;

  function x(i: number) {
    return PX + (i / (data.length - 1)) * chartW;
  }

  function y(val: number) {
    return PY + chartH - ((val - minVal) / range) * chartH;
  }

  const userPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.userReturn)}`).join(" ");
  const ibovPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.ibovReturn)}`).join(" ");

  // Area fill for user
  const userArea = `${userPath} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  const zeroY = y(0);

  return (
    <div className="rounded-2xl border border-[#E8E6E1] bg-white p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium">
          Evolução acumulada
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded-full bg-[#1A1A1A]" />
            <span className="text-[10px] text-[#9CA3AF]">Você</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded-full bg-[#C6AD7C]" />
            <span className="text-[10px] text-[#9CA3AF]">IBOV</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Zero line */}
        <line
          x1={PX}
          y1={zeroY}
          x2={W - PX}
          y2={zeroY}
          stroke="#E8E6E1"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <text x={PX - 6} y={zeroY + 3} textAnchor="end" className="text-[10px]" fill="#D9D7D2">
          0%
        </text>

        {/* User area fill */}
        <path d={userArea} fill="#1A1A1A" opacity="0.04" />

        {/* IBOV line */}
        <path
          d={ibovPath}
          fill="none"
          stroke="#C6AD7C"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 4"
        />

        {/* User line */}
        <path
          d={userPath}
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points + labels */}
        {data.map((d, i) => (
          <g key={i}>
            {/* User dot */}
            <circle cx={x(i)} cy={y(d.userReturn)} r="4" fill="#1A1A1A" />
            <circle cx={x(i)} cy={y(d.userReturn)} r="2" fill="white" />

            {/* IBOV dot */}
            <circle cx={x(i)} cy={y(d.ibovReturn)} r="3" fill="#C6AD7C" />
            <circle cx={x(i)} cy={y(d.ibovReturn)} r="1.5" fill="white" />

            {/* User value */}
            <text
              x={x(i)}
              y={y(d.userReturn) - 10}
              textAnchor="middle"
              fill="#1A1A1A"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="600"
            >
              {d.userReturn >= 0 ? "+" : ""}
              {(d.userReturn * 100).toFixed(1)}%
            </text>

            {/* Month label */}
            <text
              x={x(i)}
              y={H - 4}
              textAnchor="middle"
              fill="#D9D7D2"
              fontSize="9"
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
