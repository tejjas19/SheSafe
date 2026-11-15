import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bluetooth, History, KeyRound, LogOut, Shield, User, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SafetyProvider, useSafety } from "@/hooks/use-safety";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { ActiveSosBanner } from "@/components/active-sos";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

const nav = [
  { to: "/dashboard", label: "SOS", icon: Shield },
  { to: "/contacts", label: "Circle", icon: Users },
  { to: "/code-words", label: "Code words", icon: KeyRound },
  { to: "/wearable", label: "Wearable", icon: Bluetooth },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
] as const;

function Layout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  if (!user) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  return <SafetyProvider><Shell /></SafetyProvider>;
}

function Shell() {
  const { active } = useSafety();
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar p-5 md:flex">
        <Logo />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "bg-sidebar-accent text-foreground" }}>
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground">
          <LogOut className="size-4" /> Log out
        </button>
      </aside>

      <div className="flex-1 pb-24 md:pb-0">
        <header className="flex items-center justify-between px-5 py-4 md:hidden">
          <Logo />
          <button onClick={() => supabase.auth.signOut()} aria-label="Log out" className="text-muted-foreground"><LogOut className="size-5" /></button>
        </header>
        {active && <ActiveSosBanner />}
        <main className="mx-auto max-w-5xl px-5 py-4 md:py-10"><Outlet /></main>
      </div>

      <nav className="glass fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 rounded-2xl p-1.5 md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold text-muted-foreground"
            activeProps={{ className: "bg-secondary text-primary" }}>
            <n.icon className="size-5" /> {n.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
