"use client";

import { useEffect, useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  Award, 
  Calendar, 
  DollarSign, 
  Target, 
  TrendingUp, 
  PieChart as PieChartIcon,
  Activity,
  CalendarDays,
  Wallet
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { API_BASE_URL } from "@/lib/config";

interface ReportsData {
  category_data: Record<string, number>;
  monthly_data: Record<string, number>;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { token, user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!token) return;
    
    fetch(`${API_BASE_URL}/api/reports_data`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading reports:", err);
        setLoading(false);
      });
  }, [token]);

  const categoryArray = useMemo(() => data ? Object.entries(data.category_data).map(([name, value]) => ({ name, value })) : [], [data]);
  const monthlyArray = useMemo(() => data ? Object.entries(data.monthly_data).map(([name, value]) => ({ name, value })) : [], [data]);

  const highlights = useMemo(() => {
    if (!data || categoryArray.length === 0) return null;
    
    const topCat = [...categoryArray].sort((a, b) => b.value - a.value)[0];
    const topMonth = [...monthlyArray].sort((a, b) => b.value - a.value)[0];
    const totalSpend = categoryArray.reduce((acc, curr) => acc + curr.value, 0);

    return { topCat, topMonth, totalSpend };
  }, [data, categoryArray, monthlyArray]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
            <BarChart3 className="w-8 h-8 text-indigo-500" />
            Analytics & Reports
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Visualize your spending habits and find trends</p>
        </div>
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-100 dark:border-indigo-800 flex items-center gap-2 font-medium text-sm">
          <Activity className="w-4 h-4" /> Live Data
        </div>
      </div>

      {/* Highlights */}
      {highlights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-3xl relative overflow-hidden bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10">
            <Award className="absolute -right-4 -top-4 w-32 h-32 text-indigo-500/5" />
            <h6 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Top Category</h6>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{highlights.topCat.name}</h3>
            <p className="text-xl font-medium text-indigo-500">${highlights.topCat.value.toFixed(2)}</p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-3xl relative overflow-hidden bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10">
            <CalendarDays className="absolute -right-4 -top-4 w-32 h-32 text-emerald-500/5" />
            <h6 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Highest Month</h6>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{highlights.topMonth ? highlights.topMonth.name : 'N/A'}</h3>
            <p className="text-xl font-medium text-emerald-500">${highlights.topMonth ? highlights.topMonth.value.toFixed(2) : '0.00'}</p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-3xl relative overflow-hidden bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10">
            <Wallet className="absolute -right-4 -top-4 w-32 h-32 text-amber-500/5" />
            <h6 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Total Analyzed Spend</h6>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">${highlights.totalSpend.toFixed(2)}</h3>
            <p className="text-sm font-medium text-slate-500">Across all categories</p>
          </motion.div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pie Chart */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col">
          <h5 className="font-bold mb-6 text-slate-900 dark:text-white flex items-center justify-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <PieChartIcon className="w-5 h-5 text-indigo-500" /> Spending by Category
          </h5>
          <div className="flex-grow min-h-[350px]">
            {categoryArray.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryArray}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryArray.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `$${Number(value).toFixed(2)}`} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', backgroundColor: 'var(--glass-bg)' }} 
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <PieChartIcon className="w-12 h-12 mb-3 opacity-50" />
                <p>No category data available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col">
          <h5 className="font-bold mb-6 text-slate-900 dark:text-white flex items-center justify-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <BarChart3 className="w-5 h-5 text-emerald-500" /> Monthly Spending
          </h5>
          <div className="flex-grow min-h-[350px]">
            {monthlyArray.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyArray} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} 
                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Spent']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', backgroundColor: 'var(--glass-bg)' }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {monthlyArray.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === monthlyArray.length - 1 ? '#6366f1' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
                <p>No monthly data available.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Radar Chart */}
      <div className="glass-panel p-6 rounded-3xl">
        <h5 className="font-bold mb-6 text-slate-900 dark:text-white flex items-center justify-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Target className="w-5 h-5 text-amber-500" /> Spending Distribution
        </h5>
        <div className="w-full h-[400px]">
          {categoryArray.length > 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={categoryArray}>
                <PolarGrid stroke="rgba(99, 102, 241, 0.2)" />
                <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                <Radar name="Spent" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                <Tooltip 
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Spent']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', backgroundColor: 'var(--glass-bg)' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <Target className="w-12 h-12 mb-3 opacity-50" />
              <p>Not enough categories for distribution map. Add more receipts!</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
