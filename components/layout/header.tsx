"use client"

import { usePathname } from "next/navigation"

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/staff": "Staff",
  "/allocations": "Allocations",
  "/timeline": "Timeline",
  "/utilisation": "Utilisation",
  "/tickets": "Tickets",
  "/alerts": "Alerts",
  "/settings": "Settings",
}

function formatDate(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

export function Header() {
  const pathname = usePathname()
  const now = new Date()

  // Match the current path to a page title, falling back to the first segment
  const title =
    pageTitles[pathname] ??
    pageTitles[
      "/" + pathname.split("/").filter(Boolean)[0]
    ] ??
    "Capacity Planner"

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <h1 className="text-lg font-bold tracking-tight">{title}</h1>
      <time
        dateTime={now.toISOString().slice(0, 10)}
        className="font-mono text-sm text-muted-foreground"
      >
        {formatDate(now)}
      </time>
      {/* Gradient bottom border: teal to transparent */}
      <div
        className="absolute inset-x-0 -bottom-px h-px"
        style={{
          background: "linear-gradient(90deg, oklch(0.75 0.15 190 / 50%) 0%, transparent 70%)",
        }}
      />
    </header>
  )
}
