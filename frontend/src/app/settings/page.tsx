"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { User, Trash2, AlertTriangle, Shield, CheckCircle2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

export default function SettingsPage() {
  const { user, token, logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure you want to delete your account? This will permanently delete all your receipts and personal data. This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      setSuccess(true);
      // Wait a moment so they see the success message
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsDeleting(false);
    }
  };

  if (!user) {
    return null; // Protected layout will redirect or AuthContext is still loading
  }

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in-up">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Account Settings</h1>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
              <User className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.username}</h2>
            <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
              <Shield className="w-4 h-4" />
              Account Secure
            </div>
          </div>
        </div>

        {/* Settings Options */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Danger Zone</h3>
            
            <div className="border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-lg text-red-600 dark:text-red-400 mt-1">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-red-900 dark:text-red-400 mb-1">Delete Account</h4>
                  <p className="text-sm text-red-700 dark:text-red-300/70 mb-4">
                    Permanently delete your account, your profile, and all your scanned receipts. This action is irreversible.
                  </p>
                  
                  {error && (
                    <div className="mb-4 text-sm text-red-600 bg-red-100 dark:bg-red-900/40 p-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  {success ? (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-5 h-5" />
                      Account deleted successfully. Logging you out...
                    </div>
                  ) : (
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeleting ? "Deleting..." : "Delete My Account"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
