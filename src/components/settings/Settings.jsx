import React, { useState } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useAuth } from '../../context/AuthContext';
import { Moon, Sun, Volume2, VolumeX, Download, Globe, Shield, LogOut, User, Printer, FileText, Receipt } from 'lucide-react';
import { cn } from '../../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import SubscriptionPricing from './SubscriptionPricing';

export default function Settings() {
    const { theme, toggleTheme, soundEnabled, toggleSound, volume, setVolume } = useSettingsStore();
    const { tasks } = useTaskStore();
    const { currentUser, logout } = useAuth();
    const [exportFormat, setExportFormat] = useState('csv');

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const exportCSV = () => {
        const headers = ['ID', 'Title', 'Status', 'Priority', 'Project', 'Created At'];
        const rows = tasks.map(t => [t.id, t.title, t.completed ? 'Done' : 'Pending', t.priority, t.project, t.createdAt]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "focusflow_tasks.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        const headers = [['ID', 'Title', 'Status', 'Priority', 'Project', 'Created At']];
        const data = tasks.map(t => [t.id, t.title, t.completed ? 'Done' : 'Pending', t.priority, t.project || '-', t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-']);

        doc.setFontSize(18);
        doc.text('FocusFlow Task History', 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        autoTable(doc, {
            startY: 40,
            head: headers,
            body: data,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
            styles: { fontSize: 9, cellPadding: 3 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        doc.save('focusflow_tasks.pdf');
    };

    const exportJPG = async () => {
        // Create a hidden container slightly off-screen or invisible but rendered
        // Note: html2canvas needs the element to be in the DOM and visible (not display:none), 
        // but we can put it off-screen or z-index behind.
        const container = document.createElement('div');
        container.style.position = 'fixed'; // Use fixed to avoid scroll issues during capture
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.width = '1000px';
        container.style.backgroundColor = '#ffffff';
        container.style.padding = '40px';
        container.style.fontFamily = 'ui-sans-serif, system-ui, sans-serif';
        document.body.appendChild(container);

        // Header
        const header = document.createElement('div');
        header.innerHTML = `
            <h1 style="font-size: 32px; font-weight: bold; color: #1e293b; margin-bottom: 8px;">FocusFlow Task History</h1>
            <p style="font-size: 16px; color: #64748b; margin-bottom: 32px;">Generated on: ${new Date().toLocaleDateString()}</p>
        `;
        container.appendChild(header);

        // Table
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.border = '1px solid #e2e8f0';

        // Table Head
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        trHead.style.backgroundColor = '#4f46e5';
        trHead.style.color = 'white';

        ['ID', 'Title', 'Status', 'Priority', 'Project', 'Created At'].forEach(text => {
            const th = document.createElement('th');
            th.innerText = text;
            th.style.padding = '12px 16px';
            th.style.textAlign = 'left';
            th.style.fontSize = '14px';
            th.style.fontWeight = '600';
            th.style.borderBottom = '1px solid #e2e8f0';
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        // Table Body
        const tbody = document.createElement('tbody');
        tasks.forEach((t, i) => {
            const tr = document.createElement('tr');
            tr.style.backgroundColor = i % 2 === 0 ? '#ffffff' : '#f8fafc';

            const rowData = [
                t.id.substring(0, 8) + '...', // Truncate ID for visuals
                t.title,
                t.completed ? 'Done' : 'Pending',
                t.priority,
                t.project || '-',
                t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-'
            ];

            rowData.forEach(text => {
                const td = document.createElement('td');
                td.innerText = text;
                td.style.padding = '12px 16px';
                td.style.borderBottom = '1px solid #e2e8f0';
                td.style.fontSize = '14px';
                td.style.color = '#334155';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);

        // Add simplified branding footer
        const footer = document.createElement('div');
        footer.innerHTML = `<p style="margin-top: 24px; text-align: center; color: #cbd5e1; font-size: 12px;">Exported from FocusFlow</p>`;
        container.appendChild(footer);

        try {
            const canvas = await html2canvas(container, {
                scale: 2, // Higher resolution
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const image = canvas.toDataURL("image/jpeg", 1.0);
            const link = document.createElement('a');
            link.href = image;
            link.download = "focusflow_tasks.jpg";
            link.click();
        } catch (error) {
            console.error("Error exporting JPG:", error);
            alert("Failed to export as JPG");
        } finally {
            document.body.removeChild(container);
        }
    };

    const handleExport = () => {
        if (exportFormat === 'csv') exportCSV();
        else if (exportFormat === 'pdf') exportPDF();
        else if (exportFormat === 'jpg') exportJPG();
    };

    const generateReceiptDoc = () => {
        if (!currentUser?.hasPro && !currentUser?.hasFullAccess) {
            alert("Upgrade required to generate a receipt.");
            return null;
        }

        const isFull = currentUser?.hasFullAccess;
        const planName = isFull ? 'Full Unlock' : 'Pro Mode';
        const amountStr = isFull ? 'INR 700.00' : 'INR 300.00';

        const doc = new jsPDF();
        
        // Accurate real data based on Database schema
        const transactionId = currentUser?.razorpay_payment_id || 'N/A';
        const orderId = currentUser?.razorpay_order_id || 'N/A';
        const paymentMode = 'Razorpay Checkout';
        const activatedDate = currentUser?.premiumActivatedAt 
             ? new Date(currentUser.premiumActivatedAt).toLocaleDateString('en-IN')
             : new Date().toLocaleDateString('en-IN');
             
        // Header
        doc.setFontSize(24);
        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.text('RECEIPT', 14, 22);
        
        // Company Info
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('FocusFlow Inc.', 14, 30);
        doc.text('123 Productivity Ave, Bangalore, India', 14, 35);
        doc.text('support@focusflow.com', 14, 40);
        
        // Receipt & Date Details (Right Aligned Info)
        doc.setFontSize(10);
        doc.setTextColor(40);
        doc.text(`Receipt #: REC-${transactionId.substring(0,8).toUpperCase()}`, 130, 30);
        doc.text(`Date: ${activatedDate}`, 130, 36);
        doc.text(`Status: Paid`, 130, 42);

        // Bill To (Left)
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text('Bill To:', 14, 60);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Username: `, 14, 68);
        doc.setTextColor(40);
        doc.text(currentUser?.displayName || 'Valued Customer', 35, 68);
        
        doc.setTextColor(100);
        doc.text(`Email:    `, 14, 74);
        doc.setTextColor(40);
        doc.text(currentUser?.email || 'user@example.com', 35, 74);

        // Payment Details (Right)
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text('Payment Details:', 120, 60);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Method: `, 120, 68);
        doc.setTextColor(40);
        doc.text(paymentMode, 142, 68);

        doc.setTextColor(100);
        doc.text(`Order ID: `, 120, 74);
        doc.setTextColor(40);
        doc.text(orderId, 142, 74);
        
        doc.setTextColor(100);
        doc.text(`Txn ID: `, 120, 80);
        doc.setTextColor(40);
        doc.text(transactionId, 142, 80);
        
        // Items Table
        autoTable(doc, {
            startY: 95,
            head: [['Description', 'Plan Name', 'Billing Period', 'Amount']],
            body: [
                ['Subscription Upgrade', planName, 'Lifetime', amountStr]
            ],
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 10, cellPadding: 6 },
            columnStyles: { 3: { halign: 'right' } }
        });
        
        // Total summary
        const finalY = doc.lastAutoTable.finalY || 120;
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text('Total Paid:', 138, finalY + 15);
        doc.setFontSize(14);
        doc.setTextColor(79, 70, 229);
        doc.text(amountStr, 160, finalY + 15);

        // Footer note
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Thank you for your purchase!', 14, finalY + 30);

        return doc;
    };

    const downloadReceiptPDF = () => {
        const doc = generateReceiptDoc();
        if (doc) doc.save('FocusFlow_Receipt.pdf');
    };

    const printReceipt = () => {
        const doc = generateReceiptDoc();
        if (doc) {
            doc.autoPrint();
            const pdfUrl = doc.output('bloburl');
            window.open(pdfUrl, '_blank');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50/50">
            {/* Main Content */}
            <div className="flex-1 w-full max-w-3xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Settings</h1>
                    <p className="text-slate-500 mt-1">Customize your experience</p>
                </div>

                <div className="space-y-6">
                    {/* Account Section */}
                    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <User size={20} className="text-indigo-500" />
                                Account
                            </h3>
                        </div>
                        <div className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {currentUser?.photoURL ? (
                                    <img
                                        src={currentUser.photoURL}
                                        alt="Profile"
                                        className="w-12 h-12 rounded-full border-2 border-slate-100"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                                        {currentUser?.email?.[0].toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium text-slate-800">{currentUser?.displayName || 'User'}</p>
                                    <p className="text-sm text-slate-500">{currentUser?.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100 font-medium text-sm"
                            >
                                <LogOut size={16} />
                                Sign Out
                            </button>
                        </div>
                    </section>
                    <SubscriptionPricing />

                    {/* Billing & Receipts Section */}
                    { (currentUser?.hasPro || currentUser?.hasFullAccess) && (
                    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Receipt size={20} className="text-indigo-500" />
                                Billing & Receipts
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row items-center justify-between p-5 bg-gradient-to-br from-indigo-50/50 to-white rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-5 w-full md:w-auto">
                                    <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                        <Receipt size={28} className="drop-shadow-sm" />
                                    </div>
                                    <div className="flex-1">
                                       <div className="flex items-center gap-2">
                                           <p className="font-bold text-slate-800 text-lg tracking-tight">
                                               {currentUser?.hasFullAccess ? 'Full Unlock' : 'Pro Mode'}
                                           </p>
                                           <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold uppercase tracking-wide border border-green-200">
                                               Active
                                           </span>
                                       </div>
                                       <p className="text-sm text-slate-500 mt-0.5 font-medium">
                                           Activated: {currentUser?.premiumActivatedAt ? new Date(currentUser.premiumActivatedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric'}) : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric'})}
                                       </p>
                                       {currentUser?.razorpay_payment_id && (
                                           <p className="text-xs text-slate-400 mt-1 font-mono bg-slate-100/80 px-2 py-0.5 rounded inline-block">
                                               Txn: {currentUser.razorpay_payment_id}
                                           </p>
                                       )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 mt-6 md:mt-0 w-full md:w-auto p-4 md:p-0 bg-white md:bg-transparent rounded-xl border border-slate-100 md:border-none">
                                    <div className="text-right flex-1 md:flex-none hidden sm:block">
                                        <p className="text-xl font-bold tracking-tight text-slate-800">
                                            {currentUser?.hasFullAccess ? '₹700.00' : '₹300.00'}
                                        </p>
                                        <p className="text-xs text-indigo-500 font-medium tracking-wide">Paid via Razorpay</p>
                                    </div>
                                    <div className="h-12 w-px bg-slate-200 hidden md:block"></div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <button
                                            onClick={printReceipt}
                                            className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200"
                                            title="Print Receipt"
                                        >
                                            <Printer size={18} />
                                        </button>
                                        <button
                                            onClick={downloadReceiptPDF}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-semibold text-sm shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 active:scale-[0.98]"
                                        >
                                            <FileText size={16} />
                                            Download PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                    )}

                    {/* Data Section */}
                    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Shield size={20} className="text-indigo-500" />
                                Data & Privacy
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-700">Export Data</p>
                                    <p className="text-sm text-slate-400">Download your task history</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={exportFormat}
                                        onChange={(e) => setExportFormat(e.target.value)}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        <option value="csv">.CSV Format</option>
                                        <option value="pdf">.PDF Format</option>
                                        <option value="jpg">.JPG Format</option>
                                    </select>
                                    <button
                                        onClick={handleExport}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors border border-indigo-100 font-medium text-sm"
                                    >
                                        <Download size={16} />
                                        Export {exportFormat.toUpperCase()}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 w-full bg-white border-t border-slate-100 py-4 text-center text-slate-400 text-xs md:text-sm z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <p className="flex items-center justify-center gap-1">
                    Made with <Globe size={14} /> by FocusFlow Team
                </p>
                <p className="mt-1">v1.0.0 • Build 2024.12</p>
            </div>
        </div>
    );
}
