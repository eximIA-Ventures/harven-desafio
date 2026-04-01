"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  AlertCircle,
  Hash,
  Phone,
  User,
  Mail,
  Lock,
  ChevronLeft,
  GraduationCap,
  CheckCircle2,
  X,
} from "lucide-react";
import { track } from "@/lib/track";

type Step = "login" | "register" | "welcome" | "admin";
type LoginMode = "cpf" | "phone";

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function rawDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");
  const [loginMode, setLoginMode] = useState<LoginMode>("cpf");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [curso, setCurso] = useState("");
  const [anoIngresso, setAnoIngresso] = useState("");
  const [semestre, setSemestre] = useState("");
  const [sala, setSala] = useState("");
  const [welcomeName, setWelcomeName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCpfChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCpf(maskCpf(e.target.value));
    },
    []
  );

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPhone(maskPhone(e.target.value));
    },
    []
  );

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const isCpf = loginMode === "cpf";
    const digits = rawDigits(isCpf ? cpf : phone);

    if (isCpf && digits.length !== 11) {
      setError("Digite os 11 dígitos do CPF");
      return;
    }
    if (!isCpf && (digits.length < 10 || digits.length > 11)) {
      setError("Digite um número de celular válido");
      return;
    }

    setLoading(true);
    try {
      const payload = isCpf ? { cpf: digits } : { phone: digits };
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (data.step === "register") {
        track("register_start", { method: loginMode });
        setStep("register");
      } else if (data.step === "done") {
        track("login", { method: loginMode });
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
      const payload: Record<string, unknown> = {
        name,
        email: email || undefined,
        curso: curso || undefined,
        anoIngresso: anoIngresso ? parseInt(anoIngresso) : undefined,
        semestre: semestre ? parseInt(semestre) : undefined,
        sala: sala || undefined,
      };

      // Send identifiers (primary always, secondary if provided)
      if (rawDigits(cpf)) payload.cpf = rawDigits(cpf);
      if (rawDigits(phone)) payload.phone = rawDigits(phone);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (data.step === "done") {
        track("register_complete", { method: loginMode });
        setStep("welcome");
        setTimeout(() => router.push(data.redirectTo), 1500);
      }
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
          {/* === LOGIN === */}
          {step === "login" && (
            <>
              <h1 className="font-heading text-xl font-semibold text-[#1A1A1A] text-center">
                Entrar
              </h1>
              <p className="mt-1.5 text-center text-sm text-[#9CA3AF]">
                Acesse ou cadastre-se para participar
              </p>

              {/* Tabs CPF / Celular */}
              <div className="mt-5 flex rounded-xl bg-[#F5F4F0] p-1">
                <button
                  type="button"
                  onClick={() => { setLoginMode("cpf"); setError(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all cursor-pointer ${
                    loginMode === "cpf"
                      ? "bg-white text-[#1A1A1A] shadow-sm"
                      : "text-[#9CA3AF] hover:text-[#5C5C5C]"
                  }`}
                >
                  <Hash className="h-3.5 w-3.5" />
                  CPF
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMode("phone"); setError(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all cursor-pointer ${
                    loginMode === "phone"
                      ? "bg-white text-[#1A1A1A] shadow-sm"
                      : "text-[#9CA3AF] hover:text-[#5C5C5C]"
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Celular
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
                {loginMode === "cpf" ? (
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
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                      Celular
                    </label>
                    <div className="relative mt-1.5">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
                      <input
                        type="text"
                        inputMode="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        required
                        autoFocus
                        maxLength={15}
                        className="w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] pl-11 pr-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] focus:bg-white placeholder:text-[#D9D7D2] font-mono tracking-wide"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                )}

                {error && <ErrorMsg message={error} />}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    (loginMode === "cpf" ? rawDigits(cpf).length !== 11 : rawDigits(phone).length < 10)
                  }
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
                  setStep("login");
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
                {/* Identifier (readonly) */}
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                    {loginMode === "cpf" ? "CPF" : "Celular"}
                  </label>
                  <div className="relative mt-1.5">
                    {loginMode === "cpf" ? (
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
                    ) : (
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
                    )}
                    <input
                      type="text"
                      value={loginMode === "cpf" ? cpf : phone}
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

                {/* Secondary identifier (optional — enables login with both) */}
                {loginMode === "phone" ? (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                      CPF
                      <span className="ml-1 normal-case tracking-normal text-[#D9D7D2]">
                        (permite login por CPF também)
                      </span>
                    </label>
                    <div className="relative mt-1.5">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cpf}
                        onChange={handleCpfChange}
                        maxLength={14}
                        className="w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] pl-11 pr-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] focus:bg-white placeholder:text-[#D9D7D2] font-mono tracking-wide"
                        placeholder="000.000.000-00"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                      Celular
                      <span className="ml-1 normal-case tracking-normal text-[#D9D7D2]">
                        (permite login por celular também)
                      </span>
                    </label>
                    <div className="relative mt-1.5">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
                      <input
                        type="text"
                        inputMode="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        maxLength={15}
                        className="w-full rounded-xl border border-[#E8E6E1] bg-[#FAFAF8] pl-11 pr-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] focus:bg-white placeholder:text-[#D9D7D2] font-mono tracking-wide"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                )}

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

                {/* Terms */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#E8E6E1] accent-[#1A1A1A] cursor-pointer"
                  />
                  <span className="text-xs text-[#9CA3AF] leading-relaxed group-hover:text-[#5C5C5C] transition-colors">
                    Aceito os{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowTerms(true); }}
                      className="underline text-[#C6AD7C] hover:text-[#B59C6B] cursor-pointer"
                    >
                      termos de uso
                    </button>
                  </span>
                </label>

                {error && <ErrorMsg message={error} />}

                <button
                  type="submit"
                  disabled={loading || !name.trim() || !curso || !anoIngresso || !semestre || !sala.trim() || !acceptedTerms}
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
                  setStep("login");
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

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowTerms(false)}
          />
          <div className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-[#E8E6E1] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-[#E8E6E1] px-6 py-4">
              <h2 className="font-heading text-base font-semibold text-[#1A1A1A]">
                Termos de Uso e Privacidade
              </h2>
              <button
                onClick={() => setShowTerms(false)}
                className="rounded-lg p-1.5 text-[#9CA3AF] hover:text-[#5C5C5C] hover:bg-[#F5F4F0] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 text-sm text-[#5C5C5C] leading-relaxed space-y-4">
              <p className="font-medium text-[#1A1A1A]">
                Harven Finance League — Desafio de Carteiras
              </p>

              <div>
                <p className="font-medium text-[#1A1A1A] mb-1">1. Coleta de Dados</p>
                <p>
                  Coletamos os seguintes dados pessoais para viabilizar sua participação no
                  Desafio de Carteiras: nome completo, CPF, número de celular, e-mail
                  (opcional), curso, semestre, sala e ano de ingresso.
                </p>
              </div>

              <div>
                <p className="font-medium text-[#1A1A1A] mb-1">2. Finalidade</p>
                <p>
                  Seus dados são utilizados exclusivamente para identificação e autenticação
                  na plataforma do Desafio de Carteiras, uma atividade educacional da
                  Harven Agribusiness School. O CPF e/ou celular servem como identificador
                  único para acesso à sua conta.
                </p>
              </div>

              <div>
                <p className="font-medium text-[#1A1A1A] mb-1">3. Compartilhamento</p>
                <p>
                  Seus dados pessoais não serão compartilhados, vendidos ou cedidos
                  a terceiros, sob nenhuma circunstância. O acesso é restrito aos
                  administradores da Harven Finance League.
                </p>
              </div>

              <div>
                <p className="font-medium text-[#1A1A1A] mb-1">4. Armazenamento e Segurança</p>
                <p>
                  Os dados são armazenados em servidores seguros com criptografia.
                  O CPF é parcialmente mascarado nas interfaces da plataforma
                  (ex: ***.***. 123-45). Senhas administrativas são armazenadas
                  com hash criptográfico (bcrypt).
                </p>
              </div>

              <div>
                <p className="font-medium text-[#1A1A1A] mb-1">5. Seus Direitos (LGPD)</p>
                <p>
                  Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você
                  tem direito a: acessar seus dados, solicitar correção, solicitar
                  exclusão da sua conta e revogar o consentimento a qualquer momento.
                  Para exercer esses direitos, entre em contato com o administrador
                  da liga.
                </p>
              </div>

              <div>
                <p className="font-medium text-[#1A1A1A] mb-1">6. Consentimento</p>
                <p>
                  Ao marcar a caixa &ldquo;Aceito os termos de uso&rdquo;, você declara
                  estar ciente e de acordo com as condições acima descritas.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-[#E8E6E1] bg-[#FAFAF8] px-6 py-4">
              <button
                onClick={() => { setAcceptedTerms(true); setShowTerms(false); }}
                className="w-full rounded-xl bg-[#1A1A1A] px-6 py-3 text-sm font-medium text-white hover:bg-[#333] transition-colors cursor-pointer"
              >
                Li e aceito os termos
              </button>
            </div>
          </div>
        </div>
      )}
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
