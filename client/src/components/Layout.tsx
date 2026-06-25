import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Menu, X, BookOpen, ShoppingBag, Users, Store,
  Library, LayoutDashboard, LogIn, LogOut, UserPlus, ChevronDown, UserCog
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/store", label: "Store", icon: ShoppingBag },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/directory", label: "Directory", icon: Users },
  { href: "/resources", label: "Resources", icon: Library },
];

// Cornerstone logo mark — a stylized stone arch / cornerstone block
function CornerstoneMark({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={size} height={size} aria-label="Cornerstone Directory">
      {/* Base stone block */}
      <rect x="3" y="14" width="18" height="7" rx="1" fill="currentColor" fillOpacity="0.85"/>
      {/* Left pillar */}
      <rect x="3" y="8" width="5" height="7" rx="0.5" fill="currentColor" fillOpacity="0.65"/>
      {/* Right pillar */}
      <rect x="16" y="8" width="5" height="7" rx="0.5" fill="currentColor" fillOpacity="0.65"/>
      {/* Keystone / arch top */}
      <path d="M8 8 Q12 3 16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Cross in center stone */}
      <line x1="12" y1="15.5" x2="12" y2="19.5" stroke="hsl(25,20%,7%)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="17.5" x2="14" y2="17.5" stroke="hsl(25,20%,7%)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const isActive = (href: string) => location === href;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* TOP BAR */}
      <div className="w-full bg-[hsl(0,65%,40%)] text-[hsl(38,20%,96%)] text-xs font-semibold text-center py-1.5 tracking-wide">
        🪨 First 500 Founding Members: Lifetime Access at $59.99 —{' '}
        <span className="underline font-bold">Limited spots remaining!</span>
      </div>

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 crimson-gradient rounded-lg flex items-center justify-center shadow-lg text-[hsl(38,20%,96%)]">
              <CornerstoneMark size={18} />
            </div>
            <div>
              <span className="font-heading font-900 text-sm text-foreground block leading-none">Cornerstone</span>
              <span className="font-heading font-700 text-xs gold-text block leading-none">Directory</span>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href}>
                <span className={`px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  isActive(href)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}>
                  {label}
                </span>
              </Link>
            ))}
          </nav>

          {/* RIGHT SIDE */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-sm" data-testid="user-menu">
                    <div className="w-7 h-7 crimson-gradient rounded-full flex items-center justify-center text-xs font-bold text-[hsl(38,20%,96%)]">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <span>{user.firstName}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                      <LayoutDashboard className="w-4 h-4" /> My Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <UserCog className="w-4 h-4" /> Edit Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-destructive gap-2 cursor-pointer">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="gap-1.5" data-testid="btn-login">
                    <LogIn className="w-4 h-4" /> Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn" data-testid="btn-register">
                    <UserPlus className="w-4 h-4 mr-1.5" /> Join Now
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* MOBILE HAMBURGER */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="btn-mobile-menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* MOBILE MENU */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-2">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
                <span className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-muted cursor-pointer">
                  <Icon className="w-4 h-4 text-primary" />
                  {label}
                </span>
              </Link>
            ))}
            <div className="border-t border-border mt-2 pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    <span className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-muted cursor-pointer">
                      <LayoutDashboard className="w-4 h-4 text-primary" /> Dashboard
                    </span>
                  </Link>
                  <Link href="/profile" onClick={() => setMobileOpen(false)}>
                    <span className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-muted cursor-pointer">
                      <UserCog className="w-4 h-4 text-primary" /> Edit Profile
                    </span>
                  </Link>
                  <button onClick={() => { logout(); setMobileOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-destructive rounded-lg hover:bg-muted w-full text-left">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <LogIn className="w-4 h-4" /> Sign In
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" className="w-full crimson-gradient text-[hsl(38,20%,96%)] font-bold">
                      <UserPlus className="w-4 h-4 mr-1.5" /> Join Now
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* PAGE CONTENT */}
      <main className="flex-1">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 crimson-gradient rounded-md flex items-center justify-center text-[hsl(38,20%,96%)]">
                <CornerstoneMark size={16} />
              </div>
              <span className="font-heading font-800 text-sm">Cornerstone Directory</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              The Christian business directory built so believers can find and support each other. Rooted in faith. Built for community.
            </p>
            <p className="verse-block mt-4 text-xs max-w-xs">
              "The stone the builders rejected has become the cornerstone." — Psalm 118:22
            </p>
          </div>
          <div>
            <h4 className="font-heading font-700 text-sm mb-3">Platform</h4>
            <ul className="space-y-2">
              {[["Blog", "/blog"], ["Store", "/store"], ["Directory", "/directory"], ["Resources", "/resources"]].map(([label, href]) => (
                <li key={href}>
                  <Link href={href}>
                    <span className="text-muted-foreground text-sm hover:text-foreground transition-colors cursor-pointer">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-700 text-sm mb-3">Membership</h4>
            <ul className="space-y-2">
              {[["Join Now", "/register"], ["Sign In", "/login"], ["Dashboard", "/dashboard"]].map(([label, href]) => (
                <li key={href}>
                  <Link href={href}>
                    <span className="text-muted-foreground text-sm hover:text-foreground transition-colors cursor-pointer">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-4">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Cornerstone Directory. Built for the Body of Christ.
          </p>
        </div>
      </footer>
    </div>
  );
}
