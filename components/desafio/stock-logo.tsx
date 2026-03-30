"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function StockLogo({
  ticker,
  size = "md",
  className,
}: {
  ticker: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const label = ticker.replace(/\d+$/, "").slice(0, 3);

  const sizeClasses = size === "sm" ? "h-4 w-4 text-[7px]" : "h-6 w-6 text-[8px]";

  if (failed) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-[#F5F4F0] border border-[#E8E6E1] font-mono font-bold text-[#9CA3AF] shrink-0 leading-none",
          sizeClasses,
          className
        )}
      >
        {label}
      </span>
    );
  }

  return (
    <img
      src={`https://icons.brapi.dev/icons/${ticker}.svg`}
      alt={ticker}
      className={cn(
        "rounded-md object-contain bg-white border border-[#E8E6E1] p-0.5 shrink-0",
        sizeClasses,
        className
      )}
      onError={() => setFailed(true)}
    />
  );
}
