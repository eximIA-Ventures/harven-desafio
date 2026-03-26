"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  AlertCircle,
  Hash,
  User,
  Mail,
  Lock,
  ChevronLeft,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";

type Step = "cpf" | "register" | "welcome" | "admin";

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function rawCpf(value: string): string {
  return value.replace(/\D/g, "");
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("cpf");
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [curso, setCurso] = useState("");
  const [anoIngresso, setAnoIngresso] = useState("");
  const [semestre, setSemestre] = useState("");
  const [sala, setSala] = useState("");
  const [welcomeName, setWelcomeName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCpfChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCpf(maskCpf(e.target.value));
    },
    []
  );

  async function handleCpfSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const digits = rawCpf(cpf);
    if (digits.length !== 11) {
      setError("Digite os 11 dígitos do CPF");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: digits }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (data.step === "register") {
        setStep("register");
      } else if (data.step === "done") {
        setWelcomeName(data.userName);
        setStep("welcome");
        setTimeout(() => router.push(data.redirectTo), 1500);
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: rawCpf(cpf),
          name,
          email: email || undefined,
          curso: curso || undefined,
          anoIngresso: anoIngresso ? parseInt(anoIngresso) : undefined,
          semestre: semestre ? parseInt(semestre) : undefined,
          sala: sala || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      // New registration → onboarding
      router.push("/onboarding");
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          flow: "admin",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push(data.redirectTo);
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] right-[15%] h-80 w-80 rounded-full bg-[#C6AD7C]/[0.04] blur-3xl" />
        <div className="absolute bottom-[20%] left-[10%] h-64 w-64 rounded-full bg-[#E8E6E1]/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <Image
            src="/logos/harven-finance-horizontal.png"
            alt="Harven Finance"
            width={330}
            height={83}
            className="h-[72px] w-auto"
            priority
          />
          <div className="flex items-center gap-2">
            <div className="h-px w-8 bg-[#E8E6E1]" />
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#C6AD7C]">
              Desafio de Carteiras
            </span>
            <div className="h-px w-8 bg-[#E8E6E1]" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E6E1] bg-white p-8 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
          {/* === CPF === */}
          {step === "cpf" && (
            <>
              <h1 className="font-heading text-xl font-semibold text-[#1A1A1A] text-center">
                Entrar
              </h1>
              <p className="mt-1.5 text-center text-sm text-[#9CA3AF]">
                Digite seu CPF para acessar ou se cadastrar
              </p>

              <form onSubmit={handleCpfSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                    CPF
                  </label>
                  <div className="relative mt-1.5">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cpf}
                      onChange={handleCpfChange}
                      required
                      autoFocus
                      maxLength={14}
                      className="w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] pl-11 pr-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] focus:bg-white placeholder:text-[#D9D7D2] font-mono tracking-wide"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#D9D7D2]">
                    Usado apenas para identificação no desafio
                  </p>
                </div>

                {error && <ErrorMsg message={error} />}

                <button
                  type="submit"
                  disabled={loading || rawCpf(cpf).length !== 11}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#333] hover:shadow-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? <Spinner /> : (
                    <>
                      Continuar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-[#E8E6E1]">
                <button
                  onClick={() => {
                    setStep("admin");
                    setError("");
                  }}
                  className="w-full text-center text-[11px] text-[#9CA3AF] hover:text-[#5C5C5C] transition-colors cursor-pointer"
                >
                  Acesso administrativo →
                </button>
              </div>
            </>
          )}

          {/* === REGISTER === */}
          {step === "register" && (
            <>
              <button
                onClick={() => {
                  setStep("cpf");
                  setError("");
                }}
                className="mb-4 inline-flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#5C5C5C] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" />
                Voltar
              </button>

              <h1 className="font-heading text-xl font-semibold text-[#1A1A1A] text-center">
                Cadastro
              </h1>
              <p className="mt-1.5 text-center text-sm text-[#9CA3AF]">
                Primeira vez? Complete seu cadastro para participar.
              </p>

              <form onSubmit={handleRegister} className="mt-6 space-y-4">
                {/* CPF (readonly) */}
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                    CPF
                  </label>
                  <div className="relative mt-1.5">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
                    <input
                      type="text"
                      value={cpf}
                      disabled
                      className="w-full rounded-xl border border-[#E8E6E1] bg-[#F5F4F0] pl-11 pr-4 py-3 text-sm text-[#9CA3AF] font-mono tracking-wide cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Nome */}
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Nome Completo *
                  </label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoFocus
                      className="w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] pl-11 pr-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] focus:bg-white placeholder:text-[#D9D7D2]"
                      placeholder="Seu nome completo"
                    />
                  </div>
                </div>

                {/* Curso */}
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Curso *
                  </label>
                  <div className="relative mt-1.5">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
                    <select
                      value={curso}
                      onChange={(e) => setCurso(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] pl-11 pr-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] focus:bg-white appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Selecione o curso</option>
                      <option value="Administração">Administração</option>
                      <option value="Engenharia de Produção">Engenharia de Produção</option>
                      <option value="Direito">Direito</option>
                    </select>
                  </div>
                </div>

                {/* Semestre + Ano de Ingresso */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                      Semestre *
                    </label>
                    <select
                      value={semestre}
                      onChange={(e) => setSemestre(e.target.value)}
                      required
                      className="mt-1.5 w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] focus:bg-white appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Selecione</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                        <option key={s} value={s}>{s}º semestre</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                      Ano de Ingresso *
                    </label>
                    <input
                      type="number"
                      value={anoIngresso}
                      onChange={(e) => setAnoIngresso(e.target.value)}
                      required
                      min={2020}
                      max={2030}
                      className="mt-1.5 w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] focus:bg-white placeholder:text-[#D9D7D2] tabular-nums"
                      placeholder="2024"
                    />
                  </div>
                </div>

                {/* Sala */}
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Sala *
                  </label>
                  <input
                    type="text"
                    value={sala}
                    onChange={(e) => setSala(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] focus:bg-white placeholder:text-[#D9D7D2]"
                    placeholder="Ex: A1, B2"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Email
                    <span className="ml-1 normal-case tracking-normal text-[#D9D7D2]">
                      (opcional)
                    </span>
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] pl-11 pr-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] focus:bg-white placeholder:text-[#D9D7D2]"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                {error && <ErrorMsg message={error} />}

                <button
                  type="submit"
                  disabled={loading || !name.trim() || !curso || !anoIngresso || !semestre || !sala.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#333] hover:shadow-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? <Spinner /> : (
                    <>
                      Participar do Desafio
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* === WELCOME (returning user) === */}
          {step === "welcome" && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#16A34A]/10">
                <CheckCircle2 className="h-6 w-6 text-[#16A34A]" />
              </div>
              <h1 className="font-heading text-xl font-semibold text-[#1A1A1A]">
                Bem-vindo de volta!
              </h1>
              <p className="mt-2 text-sm text-[#9CA3AF]">
                Entrando como{" "}
                <span className="font-medium text-[#1A1A1A]">
                  {welcomeName}
                </span>
              </p>
              <div className="mt-4">
                <Spinner />
              </div>
            </div>
          )}

          {/* === ADMIN === */}
          {step === "admin" && (
            <>
              <button
                onClick={() => {
                  setStep("cpf");
                  setError("");
                }}
                className="mb-4 inline-flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#5C5C5C] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" />
                Voltar
              </button>

              <h1 className="font-heading text-xl font-semibold text-[#1A1A1A] text-center">
                Administração
              </h1>
              <p className="mt-1.5 text-center text-sm text-[#9CA3AF]">
                Acesso restrito ao professor
              </p>

              <form onSubmit={handleAdmin} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Email
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                      autoFocus
                      className="w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] pl-11 pr-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] focus:bg-white placeholder:text-[#D9D7D2]"
                      placeholder="professor@harven.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Senha
                  </label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] pl-11 pr-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] focus:bg-white placeholder:text-[#D9D7D2]"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && <ErrorMsg message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#333] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? <Spinner /> : (
                    <>
                      Entrar
                      <Lock className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-[#9CA3AF]">
          Harven Finance · Harven Agribusiness School · Ribeirão Preto
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#C6AD7C]/30 border-t-[#C6AD7C]" />
  );
}

function ErrorMsg({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
      <span className="text-sm text-red-700">{message}</span>
    </div>
  );
}
