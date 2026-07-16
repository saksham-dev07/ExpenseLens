"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Save, 
  Building2, 
  Calendar, 
  Hash, 
  MapPin, 
  DollarSign,
  Tag,
  AlertTriangle,
  Loader2,
  Edit3
} from "lucide-react";
import { Receipt } from "@/types";
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from "@/lib/config";

export default function EditReceipt() {
  const { id } = useParams();
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
        if (data.date_time) {
          const dt = new Date(data.date_time);
          data.date_time = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        }
        setReceipt(data);
      } catch (err) {
        console.error("Failed to load receipt:", err);
        setError("Failed to load receipt data.");
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [id, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!receipt) return;
    const { name, value } = e.target;
    setReceipt({ ...receipt, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/receipt/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(receipt),
      });
      
      if (!res.ok) {
        throw new Error("Failed to save updates.");
      }
      
      router.push("/");
    } catch (err: any) {
      setError(err.message || "An error occurred while saving.");
      setSaving(false);
    }
  };

  if (isAuthLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center mt-20 p-8 text-center bg-white rounded-2xl shadow-sm border border-gray-100 container mx-auto px-4 max-w-7xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Please Sign In</h2>
        <p className="text-gray-500 mb-6">You need to log in to edit receipts.</p>
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
        <Edit3 className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Receipt Not Found</h2>
        <Link href="/" className="btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3 text-slate-900 dark:text-white mb-1">
            <Edit3 className="w-8 h-8 text-indigo-500" />
            Edit Receipt #{receipt.id}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Update extracted receipt information manually</p>
        </div>
        
        <div>
          <button onClick={() => router.back()} className="btn-outline">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-3xl space-y-10">
        
        {/* Merchant Section */}
        <section>
          <h5 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-5 h-5 text-indigo-500" /> Merchant Details
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="merchant" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Merchant Name</label>
              <input 
                type="text" 
                id="merchant" 
                name="merchant" 
                value={receipt.merchant} 
                onChange={handleChange} 
                required 
                className="w-full glass-input rounded-xl px-4 py-3"
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400" /> Location / Address
              </label>
              <input 
                type="text" 
                id="location" 
                name="location" 
                value={receipt.location || ""} 
                onChange={handleChange} 
                className="w-full glass-input rounded-xl px-4 py-3"
              />
            </div>
          </div>
        </section>

        {/* Transaction Section */}
        <section>
          <h5 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Calendar className="w-5 h-5 text-sky-500" /> Transaction Details
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="date_time" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Date & Time</label>
              <input 
                type="datetime-local" 
                id="date_time" 
                name="date_time" 
                value={receipt.date_time || ""} 
                onChange={handleChange} 
                className="w-full glass-input rounded-xl px-4 py-3 [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label htmlFor="bill_no" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                <Hash className="w-4 h-4 text-slate-400" /> Bill / Invoice No.
              </label>
              <input 
                type="text" 
                id="bill_no" 
                name="bill_no" 
                value={receipt.bill_no || ""} 
                onChange={handleChange} 
                className="w-full glass-input rounded-xl px-4 py-3"
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                <Tag className="w-4 h-4 text-slate-400" /> Category
              </label>
              <select 
                id="category" 
                name="category" 
                value={receipt.category} 
                onChange={handleChange}
                className="w-full glass-input rounded-xl px-4 py-3"
              >
                <option value="Food & Dining" className="text-slate-900">Food & Dining</option>
                <option value="Groceries" className="text-slate-900">Groceries</option>
                <option value="Transportation" className="text-slate-900">Transportation</option>
                <option value="Shopping" className="text-slate-900">Shopping</option>
                <option value="Utilities" className="text-slate-900">Utilities</option>
                <option value="Entertainment" className="text-slate-900">Entertainment</option>
                <option value="Travel" className="text-slate-900">Travel</option>
                <option value="Health & Medical" className="text-slate-900">Health & Medical</option>
                <option value="Other" className="text-slate-900">Other</option>
              </select>
            </div>
          </div>
        </section>

        {/* Financial Section */}
        <section>
          <h5 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
            <DollarSign className="w-5 h-5 text-emerald-500" /> Financials
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="tax" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tax Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  id="tax" 
                  name="tax" 
                  value={receipt.tax || "0.00"} 
                  onChange={handleChange} 
                  className="w-full glass-input rounded-xl pl-8 pr-4 py-3"
                />
              </div>
            </div>
            <div>
              <label htmlFor="discount" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Discount Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  id="discount" 
                  name="discount" 
                  value={receipt.discount || "0.00"} 
                  onChange={handleChange} 
                  className="w-full glass-input rounded-xl pl-8 pr-4 py-3"
                />
              </div>
            </div>
            <div>
              <label htmlFor="total_amount" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 text-emerald-600 dark:text-emerald-400">Total Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  id="total_amount" 
                  name="total_amount" 
                  value={receipt.total_amount} 
                  onChange={handleChange} 
                  required 
                  className="w-full glass-input border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl pl-8 pr-4 py-3 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary px-8 py-3 text-lg">
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
