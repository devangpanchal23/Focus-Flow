import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Crown, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function Payment({ feature, requiredMode = 'PRO' }) {
    const { currentUser, setCurrentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const isFull = requiredMode === 'FULL';
    const amount = isFull ? 700 : 300; // in INR
    const themeColor = isFull ? "#9333ea" : "#6366f1"; // Purple for Full, Indigo for Pro

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async () => {
        setLoading(true);
        setError(null);

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
                key: "rzp_test_SXABmDfkZVtgJ5",
                amount: order.amount,
                currency: "INR",
                name: "FocusFlow SaaS",
                description: `Unlock ${requiredMode} Mode: ${feature}`,
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
                            setSuccess(true);
                            // Update currentUser context
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

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 border border-green-200 dark:border-green-800 rounded-2xl shadow-sm min-h-[500px] animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} className="text-green-500" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful!</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-center max-w-sm">
                    Welcome to {requiredMode} Mode! You now have permanent access to this premium feature.
                </p>
            </div>
        );
    }

    const gradientClass = isFull
        ? "bg-gradient-to-br from-purple-500 to-pink-600"
        : "bg-gradient-to-br from-indigo-500 to-purple-600";

    const buttonClass = isFull
        ? "bg-purple-600 hover:bg-purple-700"
        : "bg-indigo-600 hover:bg-indigo-700";

    return (
        <div className="flex flex-col items-center justify-center p-4 md:p-8 h-full min-h-[600px] animate-in fade-in duration-500">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 transition-all hover:shadow-indigo-500/10">
                <div className={`${gradientClass} p-8 text-center relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>

                    <div className="relative z-10 flex justify-center mb-4">
                        <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/30">
                            {isFull ? <Crown size={40} className="text-white" /> : <Lock size={40} className="text-white" />}
                        </div>
                    </div>
                    <h2 className="relative z-10 text-3xl font-extrabold text-white tracking-tight">Unlock {feature}</h2>
                    <p className="relative z-10 text-indigo-100 mt-2 font-medium">{requiredMode} Level Feature</p>
                </div>

                <div className="p-8">
                    <div className="flex justify-center -mt-12 relative z-20 mb-6">
                        <span className={`text-xs font-bold px-4 py-1.5 rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider ${isFull ? 'bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900' : 'bg-gradient-to-r from-blue-200 to-indigo-300 text-indigo-900'}`}>
                            {isFull ? <Crown size={14} /> : <Zap size={14} />}
                            {requiredMode} Mode Required
                        </span>
                    </div>

                    <div className="space-y-4 mb-8">
                        {isFull ? (
                            <>
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="text-purple-500 mt-0.5" size={20} />
                                    <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">Everything in Pro Mode</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="text-purple-500 mt-0.5" size={20} />
                                    <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">Advanced Habit Tracker & Journal features.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="text-purple-500 mt-0.5" size={20} />
                                    <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">Deep comprehensive Analytics view.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="text-indigo-500 mt-0.5" size={20} />
                                    <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">Organize tasks efficiently with Calendar integration.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="text-indigo-500 mt-0.5" size={20} />
                                    <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">Secure distractions with advanced Web Block.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="text-indigo-500 mt-0.5" size={20} />
                                    <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">Permanent unlock for your entire account.</p>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Lifetime Access</span>
                            <span className="text-2xl font-bold text-slate-800 dark:text-white">₹{amount}</span>
                        </div>
                        <p className="text-xs text-slate-400">One-time payment. Secure via Razorpay.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-6 border border-red-200 dark:border-red-800 flex items-start gap-2">
                            <ShieldCheck size={18} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        onClick={handlePayment}
                        disabled={loading}
                        className={`w-full relative group overflow-hidden ${buttonClass} text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100`}
                    >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                        <div className="flex items-center justify-center gap-2">
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing Securely...
                                </span>
                            ) : (
                                <>
                                    <Zap size={20} className={isFull ? "text-purple-200" : "text-indigo-200"} />
                                    <span>{isFull ? "Unlock Full Access" : "Upgrade to Pro"}</span>
                                </>
                            )}
                        </div>
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-4 flex justify-center items-center gap-1">
                        <Lock size={12} /> Secure encrypted checkout
                    </p>
                </div>
            </div>
        </div>
    );
}
