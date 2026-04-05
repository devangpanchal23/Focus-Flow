import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Crown, Zap, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function SubscriptionPricing() {
    const { currentUser, setCurrentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async (requiredMode) => {
        setLoading(true);
        setError(null);

        const isFull = requiredMode === 'FULL';
        const amount = isFull ? 700 : 300;
        const themeColor = isFull ? "#9333ea" : "#6366f1";

        const res = await loadRazorpayScript();
        if (!res) {
            setError('Failed to load Razorpay SDK. Check your connection.');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const orderRes = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ mode: requiredMode })
            });

            if (!orderRes.ok) {
                const errorData = await orderRes.json();
                throw new Error(errorData.error || 'Failed to create order');
            }

            const order = await orderRes.json();

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_SXABmDfkZVtgJ5",
                amount: order.amount,
                currency: "INR",
                name: "FocusFlow SaaS",
                description: `Unlock ${requiredMode} Access`,
                order_id: order.id,
                theme: { color: themeColor },
                handler: async function (response) {
                    try {
                        const verifyRes = await fetch('/api/payment/verify', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                mode: requiredMode,
                                amount: amount
                            })
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyRes.ok) {
                            setCurrentUser(prev => ({
                                ...prev,
                                hasPro: true,
                                ...(isFull ? { hasFullAccess: true } : {})
                            }));
                        } else {
                            setError(verifyData.error || 'Payment verification failed');
                        }
                    } catch (err) {
                        setError('Payment verification error: ' + err.message);
                    }
                },
                prefill: {
                    name: currentUser?.displayName || '',
                    email: currentUser?.email || '',
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                setError(response.error.description || 'Payment Failed');
            });
            rzp.open();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
            <div className="p-6 border-b border-slate-50 bg-gradient-to-r from-slate-50 to-white">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Crown size={24} className="text-amber-500" />
                    Subscription Plans
                </h3>
                <p className="text-sm text-slate-500 mt-1">Upgrade your account to access premium features.</p>
            </div>
            <div className="p-6">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-200 flex items-start gap-2">
                        <ShieldCheck size={18} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pro Plan */}
                    <div className="relative border-2 border-indigo-100 hover:border-indigo-300 bg-white rounded-2xl p-6 transition-all group flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Zap size={20} className="text-indigo-500" /> Pro Mode
                                </h4>
                                <p className="text-sm text-slate-500 mt-1">For focused individuals</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-indigo-600">₹300</span>
                                <span className="text-xs text-slate-400 block">Lifetime</span>
                            </div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-start gap-2 text-sm text-slate-600">
                                <CheckCircle2 size={16} className="text-indigo-500 mt-0.5" /> Calendar Integration
                            </li>
                            <li className="flex items-start gap-2 text-sm text-slate-600">
                                <CheckCircle2 size={16} className="text-indigo-500 mt-0.5" /> Advanced Web Block
                            </li>
                        </ul>
                        <button
                            onClick={() => handlePayment('PRO')}
                            disabled={currentUser?.hasFullAccess || currentUser?.hasPro || loading}
                            className="w-full py-3 px-4 rounded-xl font-semibold transition-all text-sm
                            bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {currentUser?.hasPro ? 'Current Plan' : 'Upgrade to Pro'}
                        </button>
                    </div>

                    {/* Full Plan */}
                    <div className="relative border-2 border-purple-500 bg-purple-50/30 rounded-2xl p-6 transition-all shadow-md shadow-purple-500/10 flex flex-col overflow-hidden">
                        <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                            Best Value
                        </div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Crown size={20} className="text-purple-500" /> Full Unlock
                                </h4>
                                <p className="text-sm text-slate-500 mt-1">The complete system</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-purple-600">₹700</span>
                                <span className="text-xs text-slate-400 block">Lifetime</span>
                            </div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                                <CheckCircle2 size={16} className="text-purple-500 mt-0.5" /> Everything in Pro
                            </li>
                            <li className="flex items-start gap-2 text-sm text-slate-600">
                                <CheckCircle2 size={16} className="text-purple-500 mt-0.5" /> Deep Analytics Dashboard
                            </li>
                            <li className="flex items-start gap-2 text-sm text-slate-600">
                                <CheckCircle2 size={16} className="text-purple-500 mt-0.5" /> Habit Tracker & Journal
                            </li>
                        </ul>
                        <button
                            onClick={() => handlePayment('FULL')}
                            disabled={currentUser?.hasFullAccess || loading}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {currentUser?.hasFullAccess ? 'Max Plan Active' : 'Unlock Full Access'}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
