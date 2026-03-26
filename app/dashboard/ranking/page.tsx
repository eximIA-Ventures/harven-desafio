import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RankingView } from "@/components/desafio/ranking-view";

export default async function RankingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          Ranking
        </h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Classificação por rentabilidade mensal
        </p>
      </div>

      <RankingView showChampionPopup />
    </div>
  );
}
