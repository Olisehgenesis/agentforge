"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bot,
  Plus,
  BarChart3,
  Settings,
  Zap,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Agents", href: "/dashboard/agents", icon: Bot },
  { name: "Verify", href: "/dashboard/verify", icon: ShieldCheck },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-forest border-r border-forest-light/20 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-celo shadow-lg shadow-celo/20">
          <Zap className="w-5 h-5 text-forest" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">AgentHaus</h1>
            <p className="text-[10px] text-celo font-medium tracking-wider uppercase">
              Powered by Celo
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-celo/15 text-celo border border-celo/20"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-celo")} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section: Create Agent + Collapse */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <Link
          href="/dashboard/agents/new"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            pathname === "/dashboard/agents/new"
              ? "bg-celo/25 text-celo border border-celo/30"
              : "bg-celo/10 text-celo hover:bg-celo/20 border border-celo/15"
          )}
        >
          <Plus className={cn("w-5 h-5 flex-shrink-0")} />
          {!collapsed && <span>Create Agent</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}
