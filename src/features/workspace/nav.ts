import { History, LayoutDashboard, type LucideIcon, MessageSquareText, Table2 } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "Analyze" | "Monitor" | "Sources";
  /** What the page is for, shown in hover cards and the command palette. */
  description: string;
  keywords: string;
  match: (path: string) => boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/app",
    label: "Ask",
    icon: MessageSquareText,
    group: "Analyze",
    description: "Ask a question in plain English and get the answer, a chart and the SQL behind it.",
    keywords: "chat question new query",
    // "Ask" covers a new question (/app) and an open conversation (/app/c/…).
    match: (path) => path === "/app" || path.startsWith("/app/c/"),
  },
  {
    href: "/app/history",
    label: "History",
    icon: History,
    group: "Analyze",
    description: "Every conversation you've had, to reopen, rename or delete.",
    keywords: "conversations past previous",
    match: (path) => path.startsWith("/app/history"),
  },
  {
    href: "/app/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "Monitor",
    description: "Key store metrics for the last 30 days and the charts you pinned, re-run live.",
    keywords: "kpi pinned charts overview metrics",
    match: (path) => path.startsWith("/app/dashboard"),
  },
  {
    href: "/app/upload",
    label: "Data",
    icon: Table2,
    group: "Sources",
    description: "The tables AskData can query, and your own CSV uploads.",
    keywords: "upload csv tables schema data source",
    match: (path) => path.startsWith("/app/upload"),
  },
];
