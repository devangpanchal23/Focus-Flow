import React, { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Crown, Zap, CheckCircle2, ShieldCheck } from 'lucide-react';
import { apiUrl } from '../../lib/api';

async function safeJsonParse(response) {
    const text = await response.text();

    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('Invalid JSON Response:', text);
        throw new Error('Server returned invalid response');
    }
}

async function waitForPlanActivation(getToken, requiredMode, maxAttempts = 24) {
    const wantFull = requiredMode === 'FULL';

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const token = await getToken();

            if (!token) break;

            const res = await fetch(apiUrl('/api/users/me'), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) continue;

            const data = await safeJsonParse(res);

            const user = data.user;

            const paid = user?.paymentStatus === 'completed';

            const ok = wantFull
                ? paid && user?.planType === 'full'
                : paid && (user?.planType === 'pro' || user?.planType === 'full');

            if (ok) {
                window.dispatchEvent(
                    new CustomEvent('payment_success', {
                        detail: { user },
                    })
                );

                return { ok: true, user };
            }
        } catch (error) {
            console.error(error);
        }

        await new Promise((r) => setTimeout(r, 700));
    }

    return { ok: false, user: null };
}

export default function SubscriptionPricing() {
    const { user: currentUser } = useUser();
    const { getToken } = useAuth();

    const [loading, setLoading] = useState(false);
    const [activating, setActivating] = useState(false);
    const [error, setError] = useState(null);
    const [backendProfile, setBackendProfile] = useState(null);

    const publicMetadata = currentUser?.publicMetadata || {};

    const fetchBackendProfile = useCallback(async () => {
        try {
            const token = await getToken();

            if (!token) return;

            const res = await fetch(apiUrl('/api/users/me'), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) return;

            const data = await safeJsonParse(res);

            setBackendProfile(data.user ?? null);
        } catch (error) {
            console.error('Failed to load backend profile:', error);
        }
    }, [getToken]);

    useEffect(() => {
        fetchBackendProfile();
    }, [fetchBackendProfile, currentUser?.id]);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');

            script.src = 'https://checkout.razorpay.com/v1/checkout.js';

            script.onload = () => resolve(true);

            script.onerror = () => resolve(false);

            document.body.appendChild(script);
        });
    };

    const handlePayment = async (requiredMode) => {
        setLoading(true);
        setError(null);

        try {
            const loaded = await loadRazorpayScript();

            if (!loaded) {
                throw new Error('Failed to load Razorpay SDK');
            }

            const token = await getToken();

            const orderRes = await fetch(
                apiUrl('/api/payment/create-order'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        mode: requiredMode,
                    }),
                }
            );

            const orderData = await safeJsonParse(orderRes);

            if (!orderRes.ok) {
                throw new Error(orderData.error || 'Failed to create order');
            }

            const order = orderData.order;

            const amount = requiredMode === 'FULL' ? 700 : 300;

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,

                amount: order.amount,

                currency: order.currency,

                name: 'FocusFlow SaaS',

                description: `Unlock ${requiredMode} Access`,

                order_id: order.id,

                theme: {
                    color:
                        requiredMode === 'FULL'
                            ? '#9333ea'
                            : '#6366f1',
                },

                handler: async function (response) {
                    setActivating(true);

                    try {
                        const verifyRes = await fetch(
                            apiUrl('/api/payment/verify'),
                            {
                                method: 'POST',

                                headers: {
                                    'Content-Type':
                                        'application/json',

                                    Authorization: `Bearer ${token}`,
                                },

                                body: JSON.stringify({
                                    razorpay_order_id:
                                        response.razorpay_order_id,

                                    razorpay_payment_id:
                                        response.razorpay_payment_id,

                                    razorpay_signature:
                                        response.razorpay_signature,

                                    mode: requiredMode,

                                    amount,

                                    email:
                                        currentUser
                                            ?.primaryEmailAddress
                                            ?.emailAddress,

                                    displayName:
                                        currentUser?.fullName ||
                                        currentUser?.firstName ||
                                        'Premium User',
                                }),
                            }
                        );

                        const verifyData =
                            await safeJsonParse(verifyRes);

                        if (!verifyRes.ok) {
                            throw new Error(
                                verifyData.error ||
                                'Payment verification failed'
                            );
                        }

                        if (verifyData.user) {
                            setBackendProfile(verifyData.user);

                            window.dispatchEvent(
                                new CustomEvent(
                                    'payment_success',
                                    {
                                        detail: {
                                            user: verifyData.user,
                                        },
                                    }
                                )
                            );
                        }

                        await currentUser?.reload();

                        const { ok, user } =
                            await waitForPlanActivation(
                                getToken,
                                requiredMode
                            );

                        if (user) {
                            setBackendProfile(user);
                        }

                        if (!ok) {
                            setError(
                                'Payment received but activation is taking longer than expected.'
                            );
                        }
                    } catch (error) {
                        setError(error.message);
                    } finally {
                        setActivating(false);
                    }
                },

                prefill: {
                    name:
                        currentUser?.fullName ||
                        currentUser?.firstName ||
                        '',

                    email:
                        currentUser?.primaryEmailAddress
                            ?.emailAddress || '',
                },
            };

            const razorpay = new window.Razorpay(options);

            razorpay.on('payment.failed', (response) => {
                setError(
                    response.error.description ||
                    'Payment Failed'
                );
            });

            razorpay.open();
        } catch (error) {
            console.error(error);

            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const onPaid = () => fetchBackendProfile();
        window.addEventListener('payment_success', onPaid);
        return () => window.removeEventListener('payment_success', onPaid);
    }, [fetchBackendProfile]);

    const hasFullPlan = backendProfile
        ? backendProfile.planType === 'full' || backendProfile.hasFullAccess
        : Boolean(publicMetadata.hasFullAccess || publicMetadata.planType === 'full');

    const hasProPlan = hasFullPlan || (backendProfile
        ? backendProfile.planType === 'pro' || backendProfile.hasPro
        : Boolean(publicMetadata.hasPro || publicMetadata.planType === 'pro'));

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
                {activating && (
                    <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 p-4 rounded-xl text-sm mb-6 border border-indigo-100 dark:border-indigo-800 flex items-center gap-3">
                        <svg className="animate-spin h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        <span className="font-medium">Activating your plan… Confirming with the server.</span>
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-200 flex items-start gap-2">
                        <ShieldCheck size={18} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            type="button"
                            onClick={() => handlePayment('PRO')}
                            disabled={hasFullPlan || hasProPlan || loading || activating}
                            className="w-full py-3 px-4 rounded-xl font-semibold transition-all text-sm
                            bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {hasProPlan && !hasFullPlan ? 'Current Plan' : 'Upgrade to Pro'}
                        </button>
                    </div>

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
                            type="button"
                            onClick={() => handlePayment('FULL')}
                            disabled={hasFullPlan || loading || activating}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {hasFullPlan ? 'Max Plan Active' : 'Unlock Full Access'}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}