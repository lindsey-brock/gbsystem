import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Briefcase, HardHat, Clock,
  CheckSquare, Store, ShoppingCart, FileText, FileCheck, Settings, LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GBLogo } from "@/components/GBLogo";

interface NavItem { to: string; label: string; icon: any; adminOnly?: boolean; children?: NavItem[]; }

const adminNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/clienti", label: "Clienti", icon: Users,
    children: [{ to: "/lavori", label: "Lavori", icon: Briefcase }],
  },
  {
    to: "/contractors", label: "Operai", icon: HardHat,
    children: [{ to: "/ore/approvazione", label: "Approvazione ore", icon: CheckSquare }],
  },
  { to: "/grossisti", label: "Grossisti", icon: Store },
  { to: "/acquisti", label: "Acquisti", icon: ShoppingCart },
  { to: "/fatture", label: "Fatture", icon: FileText },
  { to: "/dico", label: "Bozze DICO", icon: FileCheck },
  { to: "/impostazioni", label: "Impostazioni", icon: Settings },
];

const flatAdminNav: NavItem[] = adminNav.flatMap((item) => [item, ...(item.children ?? [])]);

const contractorNav: NavItem[] = [
  { to: "/ore", label: "Registra ore", icon: Clock },
  { to: "/ore/storico", label: "Storico ore", icon: FileText },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = role === "admin" ? adminNav : contractorNav;
  const flatNav = role === "admin" ? flatAdminNav : contractorNav;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-60 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-5 flex flex-col gap-1 border-b border-sidebar-border">
          <GBLogo className="h-14 w-auto text-sidebar-foreground" />
          <div className="text-[10px] uppercase tracking-wider opacity-70">
            {role === "admin" ? "Amministratore" : role === "contractor" ? "Operaio" : ""}
          </div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <div key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                    {item.children.map((child) => {
                      const childActive = pathname === child.to || pathname.startsWith(child.to);
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          className={cn(
                            "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition",
                            childActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60",
                          )}
                        >
                          <ChildIcon className="size-3.5" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="text-xs opacity-70 truncate mb-2">{user?.email}</div>
          <Button variant="outline" size="sm" className="w-full bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOut}>
            <LogOut className="size-3 mr-2" /> Esci
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-2">
            <GBLogo className="h-6 w-auto text-sidebar-foreground" />
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="size-4" /></Button>
        </header>
        <nav className="md:hidden flex overflow-x-auto gap-1 px-2 py-2 border-b bg-card">
          {flatNav.map((item) => {
            const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to}
                className={cn("px-3 py-1.5 rounded text-xs whitespace-nowrap",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}