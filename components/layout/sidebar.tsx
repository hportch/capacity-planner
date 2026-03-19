"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  GanttChart,
  BarChart3,
  Ticket,
  AlertTriangle,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/staff", label: "Staff", icon: Users },
  { href: "/allocations", label: "Allocations", icon: CalendarDays },
  { href: "/timeline", label: "Timeline", icon: GanttChart },
  { href: "/utilisation", label: "Utilisation", icon: BarChart3 },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/settings", label: "Settings", icon: Settings },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <aside
      style={{
        background: "linear-gradient(180deg, oklch(0.19 0.005 260) 0%, var(--sidebar) 120px)",
      }}
      className={cn(
        "flex h-full flex-col border-r border-border text-sidebar-foreground transition-[width] duration-300 ease-out",
        collapsed ? "w-[52px]" : "w-56"
      )}
    >
      {/* App title */}
      <div className="flex h-14 items-center gap-2 px-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <BarChart3 className="size-4" />
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold tracking-tight">
            Capacity Planner
          </span>
        )}
      </div>

      {/* Divider with subtle glow */}
      <div className="relative">
        <Separator />
        <div
          className="absolute inset-x-0 -bottom-px h-px"
          style={{
            background: "linear-gradient(90deg, transparent 0%, oklch(0.75 0.15 190 / 30%) 50%, transparent 100%)",
          }}
        />
      </div>

      {/* Navigation links */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-r-md px-2 text-sm font-medium transition-all duration-200",
                  active
                    ? "border-l-[3px] border-l-primary bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-l-[3px] border-l-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className={cn(
                  "size-4 shrink-0 transition-colors duration-200",
                  active ? "text-primary" : "text-sidebar-foreground/50"
                )} />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger render={linkContent} />
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return (
              <React.Fragment key={item.href}>
                {linkContent}
              </React.Fragment>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Collapse toggle */}
      <div className="flex items-center justify-center p-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCollapsed((prev) => !prev)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              />
            }
          >
            {collapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}
