import { NextResponse } from "next/server";
import {
  loginByCpf,
  registerParticipant,
  loginAdmin,
  getRedirectForRole,
  isValidCpf,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cpf, name, email, curso, anoIngresso, semestre, sala, password, flow } = body;

    // --- Admin flow ---
    if (flow === "admin") {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email e senha são obrigatórios" },
          { status: 400 }
        );
      }

      const user = await loginAdmin(email, password);
      if (!user) {
        return NextResponse.json(
          { error: "Email ou senha inválidos" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        step: "done",
        redirectTo: getRedirectForRole(user),
      });
    }

    // --- Participant flow (CPF) ---

    if (!cpf) {
      return NextResponse.json(
        { error: "CPF é obrigatório" },
        { status: 400 }
      );
    }

    if (!isValidCpf(cpf)) {
      return NextResponse.json(
        { error: "CPF inválido" },
        { status: 400 }
      );
    }

    // Step 1: Check CPF
    if (!name) {
      const result = await loginByCpf(cpf);

      if (result === null) {
        return NextResponse.json(
          { error: "Conta inativa. Entre em contato com o professor." },
          { status: 403 }
        );
      }

      if (result.isNew) {
        return NextResponse.json({ step: "register" });
      }

      return NextResponse.json({
        step: "done",
        redirectTo: getRedirectForRole(result.user),
        userName: result.user.name,
      });
    }

    // Step 2: Register
    if (!name.trim() || name.trim().length < 3) {
      return NextResponse.json(
        { error: "Nome completo é obrigatório" },
        { status: 400 }
      );
    }

    const user = await registerParticipant({ cpf, name, email, curso, anoIngresso, semestre, sala });
    return NextResponse.json({
      step: "done",
      redirectTo: getRedirectForRole(user),
    });
  } catch (error) {
    console.error("Auth failed:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
