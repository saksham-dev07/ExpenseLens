"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft, RefreshCw, Bot } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/context/AuthContext';

import { API_BASE_URL } from '@/lib/config';

export default function AdvisorPage() {
  const [advice, setAdvice] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token, user, isLoading: isAuthLoading } = useAuth();

  const fetchAdvice = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/advisor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch advice');
      const data = await res.json();
      setAdvice(data.advice || '');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching advice.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAdvice();
    }
  }, [token]);

  if (isAuthLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center mt-20 p-8 text-center bg-white rounded-2xl shadow-sm border border-gray-100 container mx-auto px-4 max-w-7xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Please Sign In</h2>
        <p className="text-gray-500 mb-6">You need to log in to access the AI Advisor.</p>
        <Link href="/login" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <button 
          onClick={fetchAdvice} 
          disabled={loading}
          className="btn-outline flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Advice
        </button>
      </div>

      <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              AI Financial Advisor <Sparkles className="w-5 h-5 text-amber-500" />
            </h1>
            <p className="text-slate-500">Personalized insights based on your receipt history</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900/50 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="text-slate-500 font-medium animate-pulse">Analyzing your spending habits...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl font-medium">
            {error}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-indigo-900 dark:prose-headings:text-indigo-300 prose-a:text-indigo-600 prose-li:text-slate-700 dark:prose-li:text-slate-300"
          >
            <ReactMarkdown>{advice}</ReactMarkdown>
          </motion.div>
        )}
      </div>
    </div>
  );
}
