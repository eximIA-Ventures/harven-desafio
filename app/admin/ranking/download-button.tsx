"use client";

import { Download } from "lucide-react";
import { useState } from "react";

export function DownloadRankingButton() {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const { toPng } = await import("html-to-image");

      const element = document.getElementById("ranking-card");
      if (!element) return;

      // Clone the element to manipulate without affecting the page
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.width = element.offsetWidth + "px";
      document.body.appendChild(clone);

      // Show desktop table in clone (it's hidden on mobile)
      const desktopTable = clone.querySelector<HTMLElement>(":scope > div.hidden");
      if (desktopTable) desktopTable.style.display = "block";

      // Limit to top 10 rows: remove rows after the 10th in the tbody
      const tbody = clone.querySelector("tbody");
      if (tbody) {
        const rows = tbody.querySelectorAll("tr");
        rows.forEach((row, i) => {
          if (i >= 10) row.remove();
        });
      }

      // Update footer to indicate top 10
      const footer = clone.querySelector<HTMLElement>("[class*='bg-[#FAFAF8]']:last-child");
      if (footer) {
        const footerText = footer.querySelector("p");
        if (footerText) {
          footerText.textContent = `Top 10 · ${footerText.textContent}`;
        }
      }

      const dataUrl = await toPng(clone, {
        pixelRatio: 2,
        backgroundColor: "#FFFFFF",
        cacheBust: true,
      });

      // Clean up clone
      document.body.removeChild(clone);

      const link = document.createElement("a");
      link.download = "ranking-top10-harven-finance.png";
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#333] hover:shadow-lg disabled:opacity-50 cursor-pointer"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Top 10
    </button>
  );
}
