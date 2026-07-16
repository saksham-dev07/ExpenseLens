"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, 
  FileText, 
  FileImage, 
  X, 
  Lightbulb, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Check,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";

interface Task {
  task_id: string;
  filename: string;
  status: "processing" | "completed" | "failed";
  error?: string;
  result_id?: number;
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "danger" } | null>(null);
  const { token, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    }
  });

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !token) return;
    setIsProcessing(true);
    setMessage(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("receipt_files", file));

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload_files`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      const data = await response.json();
      
      if (data.success && data.tasks) {
        setTasks(data.tasks.map((t: any) => ({ ...t, status: 'processing' })));
        setFiles([]); // Clear dropzone
      } else {
        setMessage({ text: "Upload failed: " + (data.error || "Unknown error"), type: "danger" });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage({ text: "Failed to connect to the server.", type: "danger" });
      setIsProcessing(false);
    }
  };

  // Polling Mechanism
  useEffect(() => {
    if (tasks.length === 0 || !token) return;

    const interval = setInterval(async () => {
      const pendingTasks = tasks.filter(t => t.status === 'processing');
      
      if (pendingTasks.length === 0) {
        clearInterval(interval);
        return;
      }

      const updatedTasks = [...tasks];
      let hasChanges = false;

      for (let i = 0; i < updatedTasks.length; i++) {
        const task = updatedTasks[i];
        if (task.status === 'processing') {
          try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${task.task_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              if (data.status !== 'processing') {
                updatedTasks[i] = { ...task, status: data.status, error: data.error, result_id: data.result_id };
                hasChanges = true;
              }
            }
          } catch (e) {
            console.error(`Failed to fetch task ${task.task_id}`);
          }
        }
      }

      if (hasChanges) {
        setTasks(updatedTasks);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [tasks, token]);

  const completedCount = tasks.filter(t => t.status !== 'processing').length;
  const isAllDone = tasks.length > 0 && completedCount === tasks.length;

  if (isAuthLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center mt-20 p-8 text-center bg-white rounded-2xl shadow-sm border border-gray-100 container mx-auto px-4 max-w-7xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Please Sign In</h2>
        <p className="text-gray-500 mb-6">You need to log in to upload receipts.</p>
        <Link href="/login" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition">Go to Login</Link>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-3xl font-bold flex justify-center items-center gap-3 text-slate-900 dark:text-white mb-3">
          <UploadCloud className="w-10 h-10 text-indigo-500" />
          Upload Receipts
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Drop your receipts here and let our AI extract the data instantly
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Tips */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-3xl">
            <h5 className="font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              How to get the best results
            </h5>
            
            <div className="space-y-6">
              {[
                { title: "Flatten the receipt", desc: "Smooth out any crumples or folds before snapping a picture." },
                { title: "Use good lighting", desc: "Avoid shadows and glare so the text is clear and readable." },
                { title: "Capture everything", desc: "Ensure the merchant name, date, items, and total are visible." }
              ].map((tip, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <h6 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{tip.title}</h6>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <h6 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider mb-3">Supported Formats</h6>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1">
                  <FileText className="w-3 h-3" /> PDF
                </span>
                <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg text-xs font-semibold flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> PNG
                </span>
                <span className="px-3 py-1.5 bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 rounded-lg text-xs font-semibold flex items-center gap-1">
                  <FileImage className="w-3 h-3" /> JPG
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dropzone or Task Queue */}
        <div className="lg:col-span-8">
          <div className="glass-panel p-8 rounded-3xl h-full flex flex-col">
            
            <AnimatePresence mode="wait">
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${
                    message.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/30 dark:text-emerald-400' 
                      : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400'
                  }`}
                >
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <span className="font-medium">{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {!isProcessing && tasks.length === 0 ? (
              // Standard Dropzone
              <>
                <div 
                  {...getRootProps()}
                  className={`flex-grow border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[300px] ${
                    isDragActive 
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' 
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <input {...getInputProps()} />
                  <motion.div 
                    animate={{ y: [0, -10, 0] }} 
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-full flex items-center justify-center mb-6"
                  >
                    <UploadCloud className="w-10 h-10" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {isDragActive ? "Drop files now" : "Drag & Drop files here"}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
                    Support for highly detailed images and multi-page PDFs
                  </p>
                  <button className="btn-outline">
                    Browse Files
                  </button>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-8"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h6 className="font-bold text-slate-700 dark:text-slate-300">Ready to upload ({files.length})</h6>
                      <button 
                        onClick={() => setFiles([])}
                        className="text-sm font-medium text-red-500 hover:text-red-600"
                      >
                        Clear all
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2 mb-6">
                      {files.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                          <div className="flex items-center gap-3 overflow-hidden">
                            {file.type.includes('pdf') ? (
                              <FileText className="w-5 h-5 text-red-500 shrink-0" />
                            ) : (
                              <FileImage className="w-5 h-5 text-indigo-500 shrink-0" />
                            )}
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                              {file.name}
                            </span>
                          </div>
                          <button 
                            onClick={() => removeFile(i)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={handleUpload}
                      className="btn-primary w-full py-3 text-lg"
                    >
                      <UploadCloud className="w-5 h-5" />
                      Upload & Process {files.length} Receipt{files.length !== 1 ? 's' : ''}
                    </button>
                  </motion.div>
                )}
              </>
            ) : (
              // Task Queue UI
              <div className="flex-grow flex flex-col h-full">
                <div className="text-center mb-8 pt-4">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    {isAllDone ? (
                      <Check className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <RefreshCw className="w-8 h-8 animate-spin" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {isAllDone ? "Processing Complete!" : "Extracting AI Data..."}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    {completedCount} of {tasks.length} receipts processed
                  </p>
                </div>

                <div className="space-y-4 mb-8 flex-grow overflow-y-auto custom-scrollbar pr-2">
                  {tasks.map((task, i) => (
                    <motion.div 
                      key={task.task_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-4 rounded-2xl border ${
                        task.status === 'completed' 
                          ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30' 
                          : task.status === 'failed'
                          ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-800/30'
                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden pr-4">
                          {task.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                          {task.status === 'failed' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
                          {task.status === 'processing' && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0" />}
                          
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                            {task.filename}
                          </span>
                        </div>
                        
                        {task.status === 'completed' && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-xs font-bold rounded-lg shrink-0">
                            Success
                          </span>
                        )}
                        {task.status === 'failed' && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-xs font-bold rounded-lg shrink-0">
                            Failed
                          </span>
                        )}
                        {task.status === 'processing' && (
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 text-xs font-bold rounded-lg shrink-0">
                            Processing
                          </span>
                        )}
                      </div>
                      {task.error && (
                        <p className="text-red-500 text-sm mt-2 ml-8">
                          {task.error}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>

                {isAllDone && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => { setTasks([]); setIsProcessing(false); }} className="btn-outline flex-1">
                      Upload More
                    </button>
                    <button onClick={() => router.push("/")} className="btn-primary flex-1 flex items-center justify-center gap-2">
                      View Dashboard <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
