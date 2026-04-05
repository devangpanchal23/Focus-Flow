import React, { useState, useEffect, useMemo } from 'react';
import { Search, DollarSign, Download, Filter, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const PaymentsDashboard = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [modeFilter, setModeFilter] = useState('ALL');

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const token = localStorage.getItem('admin_token');
                const res = await fetch('/api/admin/payments', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPayments(data);
                }
            } catch (error) {
                console.error('Failed to fetch payments', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPayments();
    }, []);

    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            const matchesSearch = p.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.razorpay_payment_id?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesMode = modeFilter === 'ALL' || p.mode === modeFilter;

            return matchesSearch && matchesMode;
        });
    }, [payments, searchTerm, modeFilter]);

    const totalRevenue = useMemo(() => {
        return filteredPayments
            .filter(p => p.status === 'SUCCESS')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
    }, [filteredPayments]);

    const handleExportCSV = () => {
        const headers = ['Date', 'Username', 'Email', 'Amount', 'Mode', 'Payment ID', 'Status'];
        const rows = filteredPayments.map(p => [
            format(new Date(p.createdAt), 'yyyy-MM-dd HH:mm:ss'),
            p.username,
            p.email,
            p.amount,
            p.mode,
            p.razorpay_payment_id,
            p.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `payments_export_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="p-8 text-white">Loading payments...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500">
                        <TrendingUp className="w-24 h-24" />
                    </div>
                    <div className="relative z-10">
                        <div className="p-3 rounded-xl w-fit mb-4 bg-emerald-500/20 text-emerald-500">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <p className="text-slate-400 font-medium mb-1">Total Revenue</p>
                        <h3 className="text-3xl font-bold text-white tracking-tight">₹{totalRevenue}</h3>
                    </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-center">
                    <h3 className="text-lg font-semibold text-white mb-4">Filters & Export</h3>
                    <div className="flex flex-wrap gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search email/username..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                        <select
                            value={modeFilter}
                            onChange={(e) => setModeFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                            <option value="ALL">All Modes</option>
                            <option value="PRO">PRO</option>
                            <option value="FULL">FULL</option>
                        </select>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                            <tr className="border-b border-slate-700/50 bg-slate-800/80">
                                <th className="py-4 px-6 font-semibold text-slate-300">Date</th>
                                <th className="py-4 px-6 font-semibold text-slate-300">User</th>
                                <th className="py-4 px-6 font-semibold text-slate-300">Mode</th>
                                <th className="py-4 px-6 font-semibold text-slate-300">Amount</th>
                                <th className="py-4 px-6 font-semibold text-slate-300">Payment ID</th>
                                <th className="py-4 px-6 font-semibold text-slate-300">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredPayments.length > 0 ? (
                                filteredPayments.map(payment => (
                                    <tr key={payment._id || payment.razorpay_payment_id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="py-4 px-6 text-slate-300 text-sm">
                                            {format(new Date(payment.createdAt), 'MMM d, yyyy h:mm a')}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="font-medium text-white">{payment.username}</div>
                                            <div className="text-sm text-slate-400">{payment.email}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold border ${payment.mode === 'FULL' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                {payment.mode}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 font-medium text-white">
                                            ₹{payment.amount}
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-400 font-mono">
                                            {payment.razorpay_payment_id || 'N/A'}
                                        </td>
                                        <td className="py-4 px-6">
                                            {payment.status === 'SUCCESS' ? (
                                                <span className="text-emerald-400 text-sm font-medium">Success</span>
                                            ) : (
                                                <span className="text-red-400 text-sm font-medium">Failed</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-slate-500">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentsDashboard;
