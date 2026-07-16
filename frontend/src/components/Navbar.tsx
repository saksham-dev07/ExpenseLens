"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Receipt, 
  LayoutDashboard, 
  UploadCloud, 
  BarChart3, 
  Bell, 
  Moon, 
  Sun, 
  Menu, 
  X,
  Plus,
  Bot,
  LogOut,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, isLoading } = useAuth();

  useEffect(() => {
    // Theme logic
    const isDark = localStorage.getItem("theme") === "dark" || 
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      setIsDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const navLinks = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Upload", href: "/upload", icon: UploadCloud },
    { name: "Advisor", href: "/advisor", icon: Bot },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: User },
  ];

  return (
    <div className="w-full sticky top-0 z-50 pt-4 px-4 pb-4">
      <nav className="glass-panel max-w-7xl mx-auto px-6 py-4 rounded-2xl flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg group-hover:scale-105 transition-transform">
            <Receipt className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Scanner<span className="text-indigo-600 dark:text-indigo-400">Pro</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        {user && (
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
                {isActive && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
        )}

        {/* Right Actions */}
        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/upload" className="btn-primary ml-2">
                <Plus className="w-4 h-4" />
                <span>New</span>
              </Link>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                <User size={16} className="text-indigo-500" />
                {user.username}
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 ml-2">
              <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary">
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-slate-600 dark:text-slate-300"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden glass-panel max-w-7xl mx-auto mt-2 rounded-2xl overflow-hidden flex flex-col p-2 gap-1"
          >
            {user && navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl font-medium flex items-center gap-3 ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.name}
                </Link>
              );
            })}
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-2 mx-4" />
            <div className="flex items-center justify-between px-4 py-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 text-slate-600 dark:text-slate-300"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="font-medium">Toggle Theme</span>
              </button>
            </div>
            
            {user ? (
              <div className="flex items-center justify-between px-4 py-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <User size={16} className="text-indigo-500" />
                  {user.username}
                </div>
                <button onClick={logout} className="text-red-500 flex items-center gap-2 text-sm font-medium">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                <Link href="/login" onClick={() => setIsMenuOpen(false)} className="w-full text-center py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  Sign in
                </Link>
                <Link href="/register" onClick={() => setIsMenuOpen(false)} className="btn-primary w-full justify-center">
                  Sign up
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
