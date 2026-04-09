'use client';

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";
import axios from "axios";
import { Upload, ChevronLeft, FileJson, FileSpreadsheet, CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [imports, setImports] = useState([]);

    useEffect(() => {
        fetchImports();
        const interval = setInterval(fetchImports, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchImports = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/import/list`, { withCredentials: true });
            setImports(res.data);
        } catch (error) {
            console.error("Failed to fetch imports", error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setMessage("");

        const formData = new FormData();
        formData.append("file", file);

        try {
            await axios.post(`${API_BASE_URL}/import/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                withCredentials: true
            });
            setMessage("Import started successfully! Your data will appear shortly.");
            setFile(null);
        } catch (error) {
            console.error("Upload failed", error);
            setMessage("Failed to upload file. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8 transition-colors duration-300">
            <header className="max-w-4xl mx-auto mb-12 flex justify-between items-start">
                <div>
                    <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-8 w-fit">
                        <ChevronLeft className="w-5 h-5" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-black tracking-tighter">Import History</h1>
                    <p className="text-muted-foreground mt-2 font-medium">Upload your Spotify streaming history files.</p>
                </div>
                <ThemeToggle />
            </header>

            <main className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 gap-8 mb-12">
                    <div className="bg-card border border-border p-8 rounded-[32px] shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-green-500/10 p-3 rounded-2xl text-green-600 dark:text-green-500">
                                <FileJson className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black">Spotify Data</h3>
                                <p className="text-sm text-muted-foreground font-medium">Upload .json or .zip files from your Spotify export</p>
                            </div>
                        </div>
                        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground font-medium">
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Extended history</li>
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Account data exports</li>
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Streaming history chunks</li>
                        </ul>
                    </div>
                </div>

                <div className="bg-card border-2 border-dashed border-border rounded-[32px] p-12 text-center shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".json,.zip"
                    />
                    <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center relative z-10"
                    >
                        <div className="bg-secondary p-6 rounded-full mb-6 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-border">
                            <Upload className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <span className="text-xl font-black mb-2 text-foreground">
                            {file ? file.name : "Choose a file to upload"}
                        </span>
                        <span className="text-muted-foreground font-medium">Drag and drop or click to browse</span>
                    </label>

                    {file && (
                        <button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="mt-8 bg-primary text-primary-foreground font-black px-12 py-4 rounded-2xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 shadow-md relative z-10"
                        >
                            {isUploading ? "Uploading..." : "Start Import"}
                        </button>
                    )}

                    {message && (
                        <p className={`mt-6 text-sm font-bold relative z-10 ${message.includes("failed") ? "text-red-500" : "text-green-600 dark:text-green-500"}`}>
                            {message}
                        </p>
                    )}
                </div>

                <div className="mt-16">
                    <h2 className="text-2xl font-black tracking-tighter mb-6">Recent Imports</h2>
                    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-widest bg-secondary/30">
                                    <th className="px-6 py-5 font-bold">File Name</th>
                                    <th className="px-6 py-5 font-bold">Status</th>
                                    <th className="px-6 py-5 font-bold">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {imports.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground font-medium">
                                            No recent imports found.
                                        </td>
                                    </tr>
                                ) : (
                                    imports.map((imp: any) => (
                                        <tr key={imp.id} className="hover:bg-secondary/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-foreground">{imp.fileName}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {imp.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />}
                                                    {imp.status === 'PROCESSING' && <Clock className="w-4 h-4 text-blue-600 dark:text-blue-500 animate-pulse" />}
                                                    {imp.status === 'PENDING' && <Clock className="w-4 h-4 text-muted-foreground" />}
                                                    {imp.status === 'FAILED' && <XCircle className="w-4 h-4 text-red-500" />}
                                                    <span className={`text-xs font-black uppercase tracking-wider ${
                                                        imp.status === 'COMPLETED' ? 'text-green-600 dark:text-green-500' :
                                                        imp.status === 'PROCESSING' ? 'text-blue-600 dark:text-blue-500' :
                                                        imp.status === 'FAILED' ? 'text-red-500' : 'text-muted-foreground'
                                                    }`}>
                                                        {imp.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground text-sm font-medium">
                                                {new Date(imp.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
