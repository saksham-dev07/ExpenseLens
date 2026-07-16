'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { UserPlus, User, Mail, Lock, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[85vh] relative">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-full -z-10 pointer-events-none">
        <div className="absolute top-[10%] right-[10%] w-72 h-72 bg-emerald-500/20 rounded-full blur-[80px] animate-pulse"></div>
        <div className="absolute bottom-[10%] left-[10%] w-72 h-72 bg-indigo-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-panel p-8 md:p-10 rounded-[2rem] max-w-md w-full shadow-2xl shadow-indigo-500/10 border border-slate-200/50 dark:border-slate-700/50 relative overflow-hidden my-8"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-indigo-500 to-purple-500"></div>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 -rotate-3 shadow-sm">
            <UserPlus className="w-8 h-8 rotate-3" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Create Account</h2>
          <p className="text-slate-500 dark:text-slate-400">Join ScannerPro to track your receipts</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            {error}
          </motion.div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Username</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                placeholder="Choose a username"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\s/g, ''))}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                placeholder="Create a secure password"
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group mt-6 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Create Account
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold ml-1 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
