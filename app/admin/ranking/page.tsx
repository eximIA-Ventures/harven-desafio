import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RankingView } from "@/components/desafio/ranking-view";
import { DownloadRankingButton } from "./download-button";
import { CsvRankingButton } from "./csv-button";

export default async function AdminRankingPage() {
  const session = await getSession();
  if (!session || session.type !== "admin") redirect("/login");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            Ranking
          </h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Visualização completa com carteiras de todos os participantes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvRankingButton />
          <DownloadRankingButton />
        </div>
      </div>

      <RankingView isAdmin showChampionPopup />
    </div>
  );
}
