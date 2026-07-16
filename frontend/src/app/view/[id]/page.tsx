"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Printer, 
  Edit3, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  Hash, 
  Tag, 
  MapPin, 
  DollarSign,
  List,
  AlignLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { Receipt } from "@/types";
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from "@/lib/config";

export default function ViewReceipt() {
  const { id } = useParams();
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const { token, user, isLoading: isAuthLoading } = useAuth();
  
  useEffect(() => {
    if (!id || !token) return;
    
    const fetchReceipt = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/receipt/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Receipt not found");
        const data = await res.json();
        setReceipt(data);
      } catch (error) {
        console.error("Failed to load receipt:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchReceipt();
  }, [id, token]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/receipt/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
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
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center mt-20 p-8 text-center bg-white rounded-2xl shadow-sm border border-gray-100 container mx-auto px-4 max-w-7xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Please Sign In</h2>
        <p className="text-gray-500 mb-6">You need to log in to view receipts.</p>
        <Link href="/login" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition">Go to Login</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <FileText className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Receipt Not Found</h2>
        <Link href="/" className="btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
              <FileText className="w-8 h-8 text-indigo-500" />
              Receipt #{receipt.id}
            </h2>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-bold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3" /> Verified
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View complete details and extracted text</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Link href="/" className="btn-outline">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <button onClick={() => window.print()} className="btn-outline">
            <Printer className="w-4 h-4" /> Print
          </button>
          <Link href={`/edit/${id}`} className="btn-primary">
            <Edit3 className="w-4 h-4" /> Edit
          </Link>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-medium transition-colors flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Info) */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
            <FileText className="absolute -right-4 -top-4 w-32 h-32 text-indigo-500/5 dark:text-indigo-400/5" />
            
            <h5 className="font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Building2 className="w-5 h-5 text-indigo-500" />
              Basic Information
            </h5>
            
            <div className="space-y-5 relative z-10">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Merchant</span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{receipt.merchant}</span>
              </div>
              
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Date & Time</span>
                <span className="font-medium flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {receipt.date_time ? new Date(receipt.date_time).toLocaleString() : 'N/A'}
                </span>
              </div>
              
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Bill / Invoice No.</span>
                <span className="font-medium flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Hash className="w-4 h-4 text-slate-400" />
                  {receipt.bill_no || 'N/A'}
                </span>
              </div>
              
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Category</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryBadge(receipt.category)}`}>
                  {receipt.category}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Location</span>
                <span className="font-medium flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{receipt.location || 'N/A'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl">
            <h5 className="font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Financials
            </h5>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Subtotal</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  ${receipt.subtotal || (parseFloat(receipt.total_amount) - parseFloat(receipt.tax || '0') - parseFloat(receipt.discount || '0')).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-red-500">
                <span className="font-medium">Discount</span>
                <span className="font-bold">-${receipt.discount || '0.00'}</span>
              </div>
              
              {receipt.taxes && receipt.taxes.length > 0 ? (
                receipt.taxes.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center text-amber-500">
                    <span className="font-medium">{t.name}</span>
                    <span className="font-bold">+${parseFloat(t.amount.toString()).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between items-center text-amber-500">
                  <span className="font-medium">Tax</span>
                  <span className="font-bold">+${receipt.tax || '0.00'}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-blue-500">
                <span className="font-medium">Tip</span>
                <span className="font-bold">+${receipt.tip || '0.00'}</span>
              </div>
              
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-lg font-bold text-slate-900 dark:text-white">Total</span>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {receipt.currency || '$'}{receipt.total_amount}
                  </span>
                  {receipt.usd_total && receipt.usd_total !== receipt.total_amount && receipt.currency && receipt.currency !== 'USD' && (
                    <span className="text-sm text-slate-500 font-medium">
                      ≈ ${receipt.usd_total} USD
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column (Items & Raw Text) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="glass-panel p-0 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <List className="w-5 h-5 text-indigo-500" />
                Line Items
              </h5>
            </div>
            
            <div className="p-6">
              {receipt.items && receipt.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Item Description</th>
                        <th className="pb-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {receipt.items.map((item, index) => (
                        <tr key={index} className="group">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <ChevronRight className="w-4 h-4 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <span className="font-bold text-slate-900 dark:text-white">{receipt.currency || '$'}{item.amount}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <MoreHorizontal className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No line items extracted for this receipt.</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl">
            <h5 className="font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
              <AlignLeft className="w-5 h-5 text-sky-500" />
              Raw Extracted Text
            </h5>
            <div className="bg-slate-900 text-slate-300 p-5 rounded-2xl font-mono text-sm h-64 overflow-y-auto custom-scrollbar shadow-inner">
              {receipt.ocr_text ? (
                <pre className="whitespace-pre-wrap leading-relaxed">{receipt.ocr_text}</pre>
              ) : (
                <div className="h-full flex items-center justify-center italic opacity-50">
                  No raw text available
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
