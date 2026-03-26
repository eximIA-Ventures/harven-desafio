"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Trophy,
  BarChart3,
  TrendingUp,
  ArrowRight,
  Shield,
  Flame,
  Zap,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Trophy,
    iconBg: "bg-[#C6AD7C]/10",
    iconColor: "text-[#C6AD7C]",
    title: "O Desafio",
    description:
      "Monte uma carteira com 10 ações do Ibovespa e dispute com seus colegas quem tem a melhor estratégia.",
    detail: "Todo mês você escolhe suas ações. Simples assim.",
  },
  {
    icon: Shield,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    title: "Modelo de Alocação",
    description:
      "Além das ações, escolha seu perfil de investimento — ele define como o restante da carteira é distribuído.",
    detail: null,
    models: [
      { label: "Conservador", desc: "70% Renda Fixa", color: "border-blue-200 bg-blue-50 text-blue-700" },
      { label: "Moderado", desc: "50% RF + Global", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
      { label: "Arrojado", desc: "30% RF + Cripto", color: "border-orange-200 bg-orange-50 text-orange-700" },
      { label: "Agressivo", desc: "10% RF + Máx. risco", color: "border-red-200 bg-red-50 text-red-700" },
    ],
  },
  {
    icon: BarChart3,
    iconBg: "bg-[#16A34A]/10",
    iconColor: "text-[#16A34A]",
    title: "Como Funciona",
    description:
      "No fim de cada mês, liquidamos as carteiras com preços reais do mercado. Quem tiver a melhor rentabilidade ou bater o IBOV, vence.",
    detail: "Acompanhe seu desempenho no ranking e no histórico.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const step = steps[current];
  const isLast = current === steps.length - 1;
  const StepIcon = step.icon;

  function handleNext() {
    if (isLast) {
      localStorage.setItem("hd-onboarding-done", "1");
      router.push("/dashboard/minha-carteira");
    } else {
      setCurrent((prev) => prev + 1);
    }
  }

  function handleSkip() {
    localStorage.setItem("hd-onboarding-done", "1");
    router.push("/dashboard/minha-carteira");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] right-[15%] h-80 w-80 rounded-full bg-[#C6AD7C]/[0.04] blur-3xl" />
        <div className="absolute bottom-[20%] left-[10%] h-64 w-64 rounded-full bg-[#E8E6E1]/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/logos/harven-finance-horizontal.png"
            alt="Harven Finance"
            width={220}
            height={55}
            className="h-[48px] w-auto"
            priority
          />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#E8E6E1] bg-white p-8 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === current
                    ? "w-8 bg-[#C6AD7C]"
                    : i < current
                      ? "w-1.5 bg-[#C6AD7C]/40"
                      : "w-1.5 bg-[#E8E6E1]"
                )}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl",
                step.iconBg
              )}
            >
              <StepIcon className={cn("h-7 w-7", step.iconColor)} />
            </div>
          </div>

          {/* Content */}
          <h2 className="font-heading text-xl font-bold text-[#1A1A1A] text-center">
            {step.title}
          </h2>
          <p className="mt-3 text-sm text-[#5C5C5C] text-center leading-relaxed">
            {step.description}
          </p>

          {step.detail && (
            <p className="mt-2 text-xs text-[#9CA3AF] text-center">
              {step.detail}
            </p>
          )}

          {/* Models grid (step 2) */}
          {"models" in step && step.models && (
            <div className="mt-5 grid grid-cols-2 gap-2">
              {step.models.map((m) => (
                <div
                  key={m.label}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-center",
                    m.color
                  )}
                >
                  <p className="text-xs font-semibold">{m.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{m.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={handleNext}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#333] hover:shadow-lg cursor-pointer"
            >
              {isLast ? (
                <>
                  Montar Minha Carteira
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>

            {!isLast && (
              <button
                onClick={handleSkip}
                className="text-center text-[11px] text-[#9CA3AF] hover:text-[#5C5C5C] transition-colors cursor-pointer"
              >
                Pular introdução
              </button>
            )}
          </div>
        </div>

        {/* Step counter */}
        <p className="mt-4 text-center text-[10px] text-[#D9D7D2]">
          {current + 1} de {steps.length}
        </p>
      </div>
    </div>
  );
}
