import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { Button } from "@/components/ui/button";
import { UserRole } from "@workspace/api-client-react";
import { LogOut, User as UserIcon, Menu, Wifi, Dumbbell } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteLogo } from "@/lib/useSiteLogo";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const logoUrl = useSiteLogo();

  if (location.startsWith('/super-admin') || location.startsWith('/center-admin')) {
    return null;
  }

  const getAdminLink = () => {
    if (!user) return null;
    if (user.role === UserRole.super_admin) return '/super-admin';
    if (user.role === UserRole.center_admin) return '/center-admin';
    return null;
  };

  const adminLink = getAdminLink();

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/classes', label: t.nav.classes },
    { href: '/online-classes', label: t.nav.online, icon: Wifi, badge: "NEW" },
    { href: '/personal-training', label: "Personal Training", icon: Dumbbell },
    { href: '/centers', label: t.nav.studios },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src={logoUrl}
              alt="Yoga Life International"
              className="h-10 w-10 object-contain group-hover:scale-105 transition-transform"
            />
            <span className="font-serif text-2xl font-bold tracking-wide text-primary">
              YOGA LIFE INTERNATIONAL
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-7">
            {navLinks.map((link) => {
              const Icon = (link as any).icon;
              const badge = (link as any).badge;
              const isActive = location === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${
                    isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-foreground/80'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {link.label}
                  {badge && (
                    <span className="ml-0.5 text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full leading-none">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-muted rounded-full p-0.5 text-xs font-semibold">
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  lang === "en"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("vi")}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  lang === "vi"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                VI
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <Button variant="ghost" className="font-medium">
                    <UserIcon className="w-4 h-4 mr-2" />
                    {t.nav.dashboard}
                  </Button>
                </Link>
                {adminLink && (
                  <Link href={adminLink}>
                    <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/5 text-xs font-semibold">
                      Admin Panel
                    </Button>
                  </Link>
                )}
                <Button variant="outline" onClick={logout} className="border-primary/20 hover:bg-primary/5">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t.nav.logout}
                </Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="font-medium">{t.nav.signIn}</Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">
                    {t.nav.joinNow}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile language switcher */}
            <div className="flex items-center bg-muted rounded-full p-0.5 text-xs font-semibold">
              <button
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 rounded-full transition-all ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >EN</button>
              <button
                onClick={() => setLang("vi")}
                className={`px-2.5 py-1 rounded-full transition-all ${lang === "vi" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >VI</button>
            </div>
            <button className="text-foreground p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-t border-border"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-3 text-base font-medium text-foreground hover:bg-primary/5 rounded-lg"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-border flex flex-col gap-2">
                {user ? (
                  <>
                    <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-start">
                        <UserIcon className="w-4 h-4 mr-2" />
                        {t.nav.dashboard}
                      </Button>
                    </Link>
                    {adminLink && (
                      <Link href={adminLink} onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full justify-start border-primary/30 text-primary">
                          Admin Panel
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" onClick={logout} className="w-full justify-start text-destructive hover:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t.nav.logout}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full">{t.nav.signIn}</Button>
                    </Link>
                    <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full bg-primary text-primary-foreground">{t.nav.joinNow}</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
