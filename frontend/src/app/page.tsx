"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { 
  Receipt as ReceiptIcon, 
  DollarSign, 
  Calculator, 
  Sparkles, 
  TrendingUp, 
  Filter, 
  UploadCloud, 
  Download, 
  Printer, 
  RefreshCw, 
  Search, 
  X, 
  Building2, 
  Calendar,
  Hash,
  Tag,
  List,
  MoreVertical,
  Edit,
  Eye,
  Inbox,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Receipt, Stats } from "@/types";
import { API_BASE_URL } from "@/lib/config";

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Receipt | '', direction: 'asc' | 'desc' }>({ key: 'date_time', direction: 'desc' });
  const { token, user, isLoading: isAuthLoading } = useAuth();

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsRes, receiptsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/receipts?per_page=100`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const statsData = await statsRes.json();
      const receiptsData = await receiptsRes.json();
      
      setStats(statsData);
      setReceipts(receiptsData.receipts || []);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const [aiMatchedIds, setAiMatchedIds] = useState<string[] | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const handleAiSearch = async () => {
    if (!searchTerm) {
      setAiMatchedIds(null);
      return;
    }
    
    setIsAiSearching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/search`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: searchTerm })
      });
      const data = await res.json();
      if (data.matched_ids) {
        setAiMatchedIds(data.matched_ids);
      } else {
        setAiMatchedIds([]);
      }
    } catch (err) {
      console.error(err);
      setAiMatchedIds([]);
    } finally {
      setIsAiSearching(false);
    }
  };

  const filteredReceipts = useMemo(() => {
    if (aiMatchedIds !== null) {
      return receipts.filter(r => aiMatchedIds.includes(r.id));
    }
    return receipts.filter(r => {
      const matchSearch = !searchTerm || 
        (r.merchant && r.merchant.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.category && r.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.bill_no && r.bill_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.items && r.items.some(i => i.name && i.name.toLowerCase().includes(searchTerm.toLowerCase())));
      
      const matchCategory = categoryFilter === "All" || (r.category && r.category.toLowerCase().includes(categoryFilter.toLowerCase()));
      
      return matchSearch && matchCategory;
    });
  }, [receipts, searchTerm, categoryFilter, aiMatchedIds]);

  const sortedReceipts = useMemo(() => {
    if (!sortConfig.key) return filteredReceipts;
    const sortKey = sortConfig.key as keyof Receipt;
    
    return [...filteredReceipts].sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];
      
      if (sortConfig.key === 'total_amount') {
        aVal = parseFloat(a.total_amount) || 0;
        bVal = parseFloat(b.total_amount) || 0;
      } else if (sortConfig.key === 'date_time') {
        aVal = a.date_time ? new Date(a.date_time).getTime() : 0;
        bVal = b.date_time ? new Date(b.date_time).getTime() : 0;
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredReceipts, sortConfig]);

  const handleSort = (key: keyof Receipt) => {
    setSortConfig(current => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: keyof Receipt) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 inline ml-1" /> : <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  const trendData = useMemo(() => {
    if (!receipts.length) return [];
    const grouped = receipts.reduce((acc: any, r) => {
      if (!r.date_time) return acc;
      const dateStr = new Date(r.date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!acc[dateStr]) acc[dateStr] = 0;
      acc[dateStr] += parseFloat(r.total_amount) || 0;
      return acc;
    }, {});
    
    return Object.keys(grouped)
      .map(date => ({ date, amount: grouped[date] }))
      .slice(-7);
  }, [receipts]);

  const topCategory = useMemo(() => {
    if (!receipts.length) return null;
    const counts = receipts.reduce((acc: any, r) => {
      const cat = r.category || 'other';
      acc[cat] = (acc[cat] || 0) + parseFloat(r.total_amount || '0');
      return acc;
    }, {});
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    return { name: top, amount: counts[top] };
  }, [receipts]);

  const handlePrint = () => window.print();
  const handleRefresh = () => fetchDashboardData();
  const exportCSV = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/export/csv`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'receipts_export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error('Export failed', err); }
  };

  const getCategoryBadge = (category: string) => {
    if (!category) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    const cat = category.toLowerCase();
    if (cat.includes("food") || cat.includes("dining")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (cat.includes("grocer")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    if (cat.includes("transport") || cat.includes("travel")) return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400";
    if (cat.includes("shop")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    if (cat.includes("health")) return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  };

  if (isAuthLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>;
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-8 pb-12">
        <div className="min-h-[75vh] flex items-center justify-center relative overflow-hidden rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-2xl shadow-indigo-500/5">
          {/* Background decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-[2.5rem] -z-10">
            <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-emerald-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '4s' }}></div>
          </div>
          
          <div className="max-w-3xl w-full p-8 md:p-12 text-center z-10 flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/30 mb-8 relative"
            >
              <div className="absolute inset-0 bg-white/20 rounded-3xl blur-[2px] backdrop-blur-md"></div>
              <ReceiptIcon className="w-12 h-12 text-white relative z-10 drop-shadow-md" />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 mb-6 tracking-tight"
            >
              Welcome to <span className="bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500 dark:from-indigo-400 dark:to-purple-400 text-transparent">ScannerPro</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-xl leading-relaxed font-medium"
            >
              Unlock intelligent AI-powered receipt tracking. Manage your expenses, extract data instantly, and gain powerful financial insights in seconds.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center"
            >
              <Link 
                href="/register" 
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 text-lg"
              >
                <Sparkles className="w-5 h-5" />
                Get Started for Free
              </Link>
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-8 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-800 dark:text-white rounded-2xl font-bold shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center text-lg"
              >
                Sign In
              </Link>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
               className="mt-16 pt-8 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-8 w-full"
            >
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">AI Extraction</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Instantly pull line items, taxes, and totals from any receipt format.</p>
              </div>
              
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left group">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-4 transition-transform group-hover:scale-110 group-hover:-rotate-3">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">Smart Analytics</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Track spending trends and categories automatically over time.</p>
              </div>
              
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left group">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3">
                  <Building2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">Tax Ready</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Keep all your expenses securely organized and ready for export.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6 pb-12"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
            <ReceiptIcon className="w-8 h-8 text-indigo-500" />
            Receipt Dashboard
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, {user.username}. Manage and analyze your receipts</p>
        </div>
        
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
        >
          <Download className="w-5 h-5" />
          Export to CSV
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Receipts</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats?.total_receipts || 0}</h3>
          </div>
          <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <ReceiptIcon className="w-8 h-8" />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Spending</p>
            <h3 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">${stats?.total_amount?.toFixed(2) || "0.00"}</h3>
          </div>
          <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-8 h-8" />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Average Spending</p>
            <h3 className="text-3xl font-bold text-sky-600 dark:text-sky-400">${stats?.average_amount?.toFixed(2) || "0.00"}</h3>
          </div>
          <div className="p-4 bg-sky-100 dark:bg-sky-900/30 rounded-2xl text-sky-600 dark:text-sky-400">
            <Calculator className="w-8 h-8" />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-2xl relative overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/10 border-indigo-100 dark:border-indigo-500/20">
          <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-indigo-500/10 dark:text-indigo-400/10" />
          <h6 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> ScannerPro AI
          </h6>
          {topCategory ? (
            <p className="text-sm text-slate-700 dark:text-slate-300 relative z-10">
              Highest spending category is <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{topCategory.name}</span> with <span className="font-bold text-emerald-600 dark:text-emerald-400">${topCategory.amount.toFixed(2)}</span>.
            </p>
          ) : (
            <p className="text-sm text-slate-500 relative z-10">Upload receipts to unlock AI insights!</p>
          )}
        </motion.div>
      </div>

      {/* Mini Trend & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-panel p-5 rounded-2xl">
          <h6 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" /> 7-Day Trend
          </h6>
          {trendData.length > 0 ? (
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Spent']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--glass-bg)' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-slate-400 text-sm">No trend data available</div>
          )}
        </div>

        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-center">
          <h6 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4" /> Categories
          </h6>
          <div className="flex flex-wrap gap-2">
            {['All', 'Food', 'Transport', 'Shopping', 'Utilities'].map(cat => (
              <button 
                key={cat} 
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  categoryFilter === cat 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-slate-900/50 p-3 rounded-2xl backdrop-blur-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Link href="/upload" className="btn-primary">
            <UploadCloud className="w-4 h-4" /> Upload
          </Link>
          <button onClick={exportCSV} className="btn-outline">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={handlePrint} className="btn-outline hidden sm:flex">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handleRefresh} className="btn-outline">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        
        <div className="relative w-full md:w-80 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search or Ask AI..." 
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                if (e.target.value === '') setAiMatchedIds(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAiSearch();
              }}
              className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-sm transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(""); setAiMatchedIds(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button 
            onClick={handleAiSearch}
            disabled={isAiSearching || !searchTerm}
            className={`btn-primary px-3 ${isAiSearching ? 'opacity-70 cursor-not-allowed' : ''}`}
            title="Semantic AI Search"
          >
            {isAiSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : '✨'}
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500 font-medium px-1">
        Showing <span className="text-indigo-600 dark:text-indigo-400 font-bold">{filteredReceipts.length}</span> of {receipts.length} receipts
      </p>

      {/* Receipts Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
                <th onClick={() => handleSort('id')} className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-500 transition-colors"><Hash className="w-4 h-4 inline mr-1"/> ID {getSortIcon('id')}</th>
                <th onClick={() => handleSort('merchant')} className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-500 transition-colors"><Building2 className="w-4 h-4 inline mr-1"/> Merchant {getSortIcon('merchant')}</th>
                <th onClick={() => handleSort('date_time')} className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-500 transition-colors"><Calendar className="w-4 h-4 inline mr-1"/> Date {getSortIcon('date_time')}</th>
                <th onClick={() => handleSort('total_amount')} className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-500 transition-colors"><DollarSign className="w-4 h-4 inline mr-1"/> Amount {getSortIcon('total_amount')}</th>
                <th onClick={() => handleSort('category')} className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-500 transition-colors"><Tag className="w-4 h-4 inline mr-1"/> Category {getSortIcon('category')}</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider"><List className="w-4 h-4 inline mr-1"/> Items</th>
                <th className="py-4 px-6 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              <AnimatePresence>
                {sortedReceipts.length > 0 ? sortedReceipts.map((r, index) => (
                  <motion.tr 
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md" title={r.id}>
                        #{r.id.slice(0, 6)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">{r.merchant}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                      {r.date_time ? new Date(r.date_time).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg w-fit">
                          {r.currency || '$'}{r.total_amount}
                        </span>
                        {r.usd_total && r.usd_total !== r.total_amount && r.currency && r.currency !== 'USD' && (
                          <span className="text-xs text-slate-500 font-medium pl-1">
                            ≈ ${r.usd_total} USD
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryBadge(r.category)}`}>
                        {r.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {r.items && r.items.length > 0 ? (
                        <div className="max-h-20 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                          {r.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">• {item.name}</span>
                              <span className="font-medium text-slate-900 dark:text-white">{r.currency || '$'}{item.amount}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No items</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/edit/${r.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <Link href={`/view/${r.id}`} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                          <Inbox className="w-8 h-8 text-slate-400" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No receipts found</h4>
                        <p className="text-sm text-slate-500 mb-6 max-w-sm">
                          {searchTerm ? "Try adjusting your search or filters to find what you're looking for." : "Start tracking your expenses by uploading your first receipt!"}
                        </p>
                        {!searchTerm && (
                          <Link href="/upload" className="btn-primary">
                            <UploadCloud className="w-4 h-4" /> Upload Receipt
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
