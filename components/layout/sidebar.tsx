"use client";

import { cn } from "@/lib/utils";
import {
  Trophy,
  Briefcase,
  History,
  Users,
  CalendarClock,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  BarChart3,
  GitCompareArrows,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
};

const participantNav: NavItem[] = [
  { href: "/dashboard/minha-carteira", label: "Minha Carteira", icon: Briefcase },
  { href: "/dashboard/ranking", label: "Ranking", icon: Trophy },
  { href: "/dashboard/historico", label: "Histórico", icon: History },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/admin/ranking", label: "Ranking", icon: Trophy },
  { href: "/admin/participantes", label: "Participantes", icon: Users },
  { href: "/admin/ciclos", label: "Ciclos Mensais", icon: CalendarClock },
  { href: "/admin/comparar", label: "Comparar", icon: GitCompareArrows },
  { href: "/admin/insights", label: "Insights", icon: BarChart3 },
];

export function Sidebar({ userType }: { userType: "participant" | "admin" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = userType === "admin" ? adminNav : participantNav;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo area */}
      <div className="p-5 pb-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logos/harven-finance-horizontal.png"
            alt="Harven Finance"
            width={340}
            height={85}
            className="h-[52px] w-auto"
          />
        </div>
      </div>

      {/* Divider with label */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-[#E8E6E1]" />
          <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#C6AD7C]">
            Desafio de Carteiras
          </span>
          <div className="h-px flex-1 bg-[#E8E6E1]" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-[#1A1A1A] text-white shadow-sm"
                  : "text-[#5C5C5C] hover:bg-[#F5F4F0] hover:text-[#1A1A1A]"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  isActive
                    ? "text-[#C6AD7C]"
                    : "text-[#9CA3AF] group-hover:text-[#C6AD7C]"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 mt-auto">
        <div className="rounded-xl bg-[#FAFAF8] border border-[#E8E6E1] p-3 mb-3">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">
            {userType === "admin" ? "Administrador" : "Participante"}
          </p>
          <p className="text-xs font-medium text-[#1A1A1A] truncate">
            Desafio de Carteiras HF
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-medium text-[#9CA3AF] hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-[#E8E6E1] bg-white">
        {sidebarContent}
      </aside>

      {/* Mobile toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white/90 backdrop-blur-xl border-b border-[#E8E6E1] px-4 py-3">
        <Image
          src="/logos/harven-finance-horizontal.png"
          alt="Harven Finance"
          width={140}
          height={35}
          className="h-8 w-auto"
        />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-xl p-2.5 text-[#5C5C5C] hover:bg-[#F5F4F0] cursor-pointer"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col bg-white shadow-2xl">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
