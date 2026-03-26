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

      // Force desktop table visible for capture (hidden md:block → show it)
      const desktopTable = element.querySelector<HTMLElement>(
        ":scope > div.hidden"
      );
      if (desktopTable) desktopTable.style.display = "block";

      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: "#FFFFFF",
        cacheBust: true,
      });

      // Restore responsive hiding
      if (desktopTable) desktopTable.style.display = "";

      const link = document.createElement("a");
      link.download = "ranking-harven-finance.png";
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
      Baixar Imagem
    </button>
  );
}
