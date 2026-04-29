"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Music, BarChart3, Users, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const navItems = [
    { href: "/", label: "Koncerty", icon: Music },
    { href: "/stats", label: "Statistiky", icon: BarChart3 },
    { href: "/members", label: "Členové", icon: Users },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="mr-2 flex items-center gap-2">
            <Image src="/logo.png" alt="TheFeet" width={40} height={40} className="rounded" />
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "gap-2 text-sm h-10 px-4",
                    pathname === item.href && "bg-secondary text-secondary-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/gig/new">
            <Button className="gap-2 h-10 px-4">
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Nový koncert</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground h-10 w-10">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
