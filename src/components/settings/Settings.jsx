import React, { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useUser, UserButton, useAuth } from '@clerk/clerk-react';
import { Moon, Sun, Volume2, VolumeX, Download, Globe, Shield, User, Printer, FileText, Receipt } from 'lucide-react';
import { cn } from '../../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import SubscriptionPricing from './SubscriptionPricing';

function formatReceiptDateTime(value) {
    if (value == null) return '—';
    try {
        return new Date(value).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return '—';
    }
}

/** @param payment from GET /api/payment/history; profile Clerk user-facing fields */
function buildPurchaseReceiptPdf(payment, profile) {
    const doc = new jsPDF();
    const planName = payment.mode === 'FULL' ? 'Full Unlock (Lifetime)' : 'Pro Mode (Lifetime)';
    const amountNum = typeof payment.amount === 'number' ? payment.amount : Number(payment.amount);
    const currency = payment.currency || 'INR';
    const amountStr = `${currency} ${amountNum.toFixed(2)}`;
    const txn = payment.razorpay_payment_id || 'N/A';
    const orderId = payment.razorpay_order_id || 'N/A';

    const displayName =
        profile?.fullName || profile?.firstName || payment.username || 'Valued customer';
    const accountEmail =
        profile?.primaryEmailAddress?.emailAddress || payment.email || '—';

    const cardLine =
        payment.cardLast4 && String(payment.cardLast4).length > 0
            ? `**** ${payment.cardLast4}${payment.cardNetwork ? ` (${payment.cardNetwork})` : ''}`
            : '—';

    const methodLabel =
        payment.paymentMethod && String(payment.paymentMethod).trim()
            ? String(payment.paymentMethod).replace(/_/g, ' ').toUpperCase()
            : '—';

    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text('PAYMENT RECEIPT', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('FocusFlow', 14, 28);
    doc.text('Lifetime plan purchase via Razorpay', 14, 33);
    doc.text('support@focusflow.com', 14, 38);

    const receiptNo = txn !== 'N/A' ? `REC-${txn.slice(-10).toUpperCase()}` : `REC-${String(payment.id || '').slice(-8).toUpperCase()}`;
    doc.setTextColor(40);
    doc.text(`Receipt #: ${receiptNo}`, 130, 28);
    doc.text(`Printed: ${formatReceiptDateTime(new Date())}`, 130, 34);
    doc.text(`Store record: ${formatReceiptDateTime(payment.createdAtReceipt)}`, 130, 40);

    const bodyRows = [
        ['Plan', planName],
        ['Billing', 'Lifetime (one-time)'],
        ['Amount paid', amountStr],
        ['Bill to', displayName],
        ['Account email', accountEmail],
        ['Payment initiated (gateway)', formatReceiptDateTime(payment.paidAtReceipt)],
        ['Payment captured (gateway)', formatReceiptDateTime(payment.captureAtReceipt)],
        ['Gateway order ID', orderId],
        ['Transaction ID', txn],
        ['Gateway status', payment.razorpayStatus || payment.status || '—'],
        ['Payment method', methodLabel],
        ['Bank', payment.bank?.trim?.() ? payment.bank : '—'],
        ['Wallet', payment.wallet?.trim?.() ? payment.wallet : '—'],
        ['UPI / VPA', payment.vpa?.trim?.() ? payment.vpa : '—'],
        ['Card', cardLine],
        ['Payer email (Razorpay)', payment.payerRzpEmail?.trim?.() ? payment.payerRzpEmail : '—'],
        ['Contact phone', payment.contactPhone?.trim?.() ? payment.contactPhone : '—'],
        [
            'International',
            typeof payment.international === 'boolean' ? (payment.international ? 'Yes' : 'No') : '—',
        ],
    ];

    if (payment.description && String(payment.description).trim()) {
        bodyRows.push(['Notes', String(payment.description).trim()]);
    }
    if (payment.feeRupee != null || payment.taxRupee != null) {
        bodyRows.push([
            'Gateway fee',
            payment.feeRupee != null ? `₹${Number(payment.feeRupee).toFixed(2)}` : '—',
        ]);
        bodyRows.push([
            'Gateway tax',
            payment.taxRupee != null ? `₹${Number(payment.taxRupee).toFixed(2)}` : '—',
        ]);
    }

    autoTable(doc, {
        startY: 50,
        head: [['Detail', 'Value']],
        body: bodyRows,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 0: { cellWidth: 56 }, 1: { cellWidth: 124 } },
    });

    const finalY = doc.lastAutoTable?.finalY || 170;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('This receipt reflects data returned by Razorpay at payment time.', 14, finalY + 12);
    doc.text('Retain this for your records. For disputes, quote the Transaction ID above.', 14, finalY + 18);

    return doc;
}

export default function Settings() {
    const { theme, toggleTheme, soundEnabled, toggleSound, volume, setVolume } = useSettingsStore();
    const { tasks } = useTaskStore();
    const { user: currentUser } = useUser();
    const { getToken } = useAuth();
    const [exportFormat, setExportFormat] = useState('csv');
    const [receiptRecords, setReceiptRecords] = useState([]);
    const [receiptsLoading, setReceiptsLoading] = useState(false);
    const [receiptsError, setReceiptsError] = useState(null);

    const pm = currentUser?.publicMetadata || {};
    const viewerHasPaid = !!(
        currentUser?.hasPro ||
        currentUser?.hasFullAccess ||
        pm.hasPro ||
        pm.hasFullAccess
    );

    const clerkReceiptProfile = {
        fullName: currentUser?.fullName,
        firstName: currentUser?.firstName,
        primaryEmailAddress: currentUser?.primaryEmailAddress,
    };

    const loadReceiptList = useCallback(async () => {
        if (!currentUser?.id) {
            setReceiptRecords([]);
            return;
        }
        setReceiptsLoading(true);
        setReceiptsError(null);
        try {
            const token = await getToken();
            if (!token) return;
            const res = await fetch('/api/payment/history', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || err.message || 'Failed to load receipts');
            }
            const data = await res.json();
            setReceiptRecords(Array.isArray(data.payments) ? data.payments : []);
        } catch (e) {
            setReceiptsError(e.message || 'Could not load receipts');
        } finally {
            setReceiptsLoading(false);
        }
    }, [currentUser?.id, getToken]);

    useEffect(() => {
        loadReceiptList();
    }, [loadReceiptList]);

    useEffect(() => {
        const onPay = () => loadReceiptList();
        window.addEventListener('payment_success', onPay);
        return () => window.removeEventListener('payment_success', onPay);
    }, [loadReceiptList]);

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

    const downloadReceiptPdf = (payment) => {
        const doc = buildPurchaseReceiptPdf(payment, clerkReceiptProfile);
        if (!doc) return;
        const safeTxn = String(payment.razorpay_payment_id || payment.id || 'txn').replace(/\W+/g, '').slice(-14);
        doc.save(`FocusFlow_Receipt_${payment.mode}_${safeTxn}.pdf`);
    };

    const printReceiptPdf = (payment) => {
        const doc = buildPurchaseReceiptPdf(payment, clerkReceiptProfile);
        if (!doc) return;
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
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
                                <UserButton appearance={{ elements: { userButtonAvatarBox: "w-12 h-12 border-2 border-slate-100 shadow-sm" } }} />
                                <div>
                                    <p className="font-medium text-slate-800">{currentUser?.fullName || currentUser?.firstName || 'User'}</p>
                                    <p className="text-sm text-slate-500">{currentUser?.primaryEmailAddress?.emailAddress}</p>
                                </div>
                            </div>
                        </div>
                    </section>
                    <SubscriptionPricing />

                    {/* Billing & Receipts — one row per completed payment (Pro + Full upgrades each have a receipt) */}
                    {(viewerHasPaid || receiptRecords.length > 0) && (
                    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Receipt size={20} className="text-indigo-500" />
                                Billing & Receipts
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Full PDF receipts with gateway time, order ID, transaction ID, bank / UPI / wallet, card (if applicable), and fees when Razorpay provides them.
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            {receiptsLoading && (
                                <div className="text-sm text-slate-500">Loading purchase receipts…</div>
                            )}
                            {receiptsError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                                    {receiptsError}
                                </div>
                            )}
                            {!receiptsLoading && receiptRecords.length === 0 && (
                                <p className="text-sm text-slate-500">
                                    No receipts in your account yet. After a successful payment, refresh this page—or buy a plan—the list updates automatically.
                                </p>
                            )}
                            {!receiptsLoading && receiptRecords.length > 0 && (
                                <ul className="space-y-3">
                                    {receiptRecords.map((p) => {
                                        const planLabel =
                                            p.mode === 'FULL' ? 'Full Unlock (Lifetime)' : 'Pro Mode (Lifetime)';
                                        const amt = typeof p.amount === 'number' ? p.amount : Number(p.amount);
                                        const chips = [];
                                        if (p.paymentMethod)
                                            chips.push(p.paymentMethod.replace(/_/g, ' '));
                                        if (p.bank && String(p.bank).trim())
                                            chips.push(`Bank: ${p.bank}`);
                                        if (p.vpa && String(p.vpa).trim())
                                            chips.push(`UPI: ${p.vpa}`);
                                        if (p.wallet && String(p.wallet).trim())
                                            chips.push(`Wallet: ${p.wallet}`);
                                        return (
                                            <li
                                                key={p.id}
                                                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-indigo-100 transition-colors"
                                            >
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className="shrink-0 w-11 h-11 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                                        <Receipt size={22} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span
                                                                className={cn(
                                                                    'font-bold text-slate-800',
                                                                    p.mode === 'FULL'
                                                                        ? 'text-purple-700'
                                                                        : 'text-indigo-700'
                                                                )}
                                                            >
                                                                {planLabel}
                                                            </span>
                                                            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-green-100 text-green-700 border border-green-200">
                                                                Paid
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 mt-0.5">
                                                            <span className="font-semibold text-slate-800">
                                                                {p.currency === 'INR' ? `₹${amt.toFixed(2)}` : `${p.currency} ${amt.toFixed(2)}`}
                                                            </span>
                                                            <span className="text-slate-400 mx-2">•</span>
                                                            Record date:{' '}
                                                            <span>{formatReceiptDateTime(p.createdAtReceipt)}</span>
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 mt-1 font-mono break-all">
                                                            Txn {p.razorpay_payment_id || '—'}
                                                        </p>
                                                        {chips.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                                {chips.slice(0, 4).map((c, i) => (
                                                                    <span
                                                                        key={`${p.id}-${i}`}
                                                                        className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 max-w-[200px] truncate"
                                                                        title={c}
                                                                    >
                                                                        {c}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 gap-2 sm:flex-col lg:flex-row">
                                                    <button
                                                        type="button"
                                                        onClick={() => printReceiptPdf(p)}
                                                        className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl border border-slate-200 bg-white shadow-sm"
                                                        title="Print receipt"
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadReceiptPdf(p)}
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                                                    >
                                                        <FileText size={16} />
                                                        Download PDF
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
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
