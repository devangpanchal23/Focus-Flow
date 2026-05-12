import React, { useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import {
    Lock,
    Crown,
    Zap,
    ShieldCheck,
    CheckCircle2,
} from 'lucide-react';
import { apiUrl } from '../../lib/api';

// ===============================
// Safe JSON Parser
// ===============================
async function safeJsonParse(response) {
    const text = await response.text();

    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('Invalid JSON Response:', text);
        throw new Error('Server returned invalid response');
    }
}

// ===============================
// Wait For Plan Activation
// ===============================
async function waitForPlanActivation(
    getToken,
    requiredMode,
    maxAttempts = 24
) {
    const wantFull = requiredMode === 'FULL';

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const token = await getToken();

            if (!token) break;

            const res = await fetch(
                apiUrl('/api/users/me'),
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res.ok) continue;

            const data = await safeJsonParse(res);

            const user = data.user;

            const paid =
                user?.paymentStatus === 'completed';

            const ok = wantFull
                ? paid && user?.planType === 'full'
                : paid &&
                (user?.planType === 'pro' ||
                    user?.planType === 'full');

            if (ok) {
                window.dispatchEvent(
                    new CustomEvent('payment_success', {
                        detail: { user },
                    })
                );

                return true;
            }
        } catch (error) {
            console.error(error);
        }

        await new Promise((r) =>
            setTimeout(r, 700)
        );
    }

    return false;
}

export default function Payment({
    feature,
    requiredMode = 'PRO',
}) {
    const { user: currentUser } = useUser();

    const { getToken } = useAuth();

    const [loading, setLoading] = useState(false);

    const [activating, setActivating] =
        useState(false);

    const [error, setError] = useState(null);

    const [success, setSuccess] =
        useState(false);

    const isFull = requiredMode === 'FULL';

    const amount = isFull ? 700 : 300;

    const themeColor = isFull
        ? '#9333ea'
        : '#6366f1';

    // ===============================
    // Load Razorpay Script
    // ===============================
    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script =
                document.createElement('script');

            script.src =
                'https://checkout.razorpay.com/v1/checkout.js';

            script.onload = () => resolve(true);

            script.onerror = () => resolve(false);

            document.body.appendChild(script);
        });
    };

    // ===============================
    // Handle Payment
    // ===============================
    const handlePayment = async () => {
        setLoading(true);

        setError(null);

        try {
            // -------------------------------
            // Load Razorpay SDK
            // -------------------------------
            const loaded =
                await loadRazorpayScript();

            if (!loaded) {
                throw new Error(
                    'Failed to load Razorpay SDK'
                );
            }

            // -------------------------------
            // Get Auth Token
            // -------------------------------
            const token = await getToken();

            if (!token) {
                throw new Error(
                    'Authentication failed'
                );
            }

            // -------------------------------
            // Create Order
            // -------------------------------
            const orderRes = await fetch(
                apiUrl('/api/payment/create-order'),
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',

                        Authorization: `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        mode: requiredMode,
                    }),
                }
            );

            const orderData =
                await safeJsonParse(orderRes);

            if (!orderRes.ok) {
                throw new Error(
                    orderData.error ||
                    'Failed to create order'
                );
            }

            const order = orderData.order;

            // -------------------------------
            // Razorpay Options
            // -------------------------------
            const options = {
                key:
                    import.meta.env
                        .VITE_RAZORPAY_KEY_ID,

                amount: order.amount,

                currency: order.currency,

                name: 'FocusFlow SaaS',

                description: `Unlock ${requiredMode} Mode: ${feature}`,

                order_id: order.id,

                theme: {
                    color: themeColor,
                },

                prefill: {
                    name:
                        currentUser?.fullName ||
                        currentUser?.firstName ||
                        '',

                    email:
                        currentUser
                            ?.primaryEmailAddress
                            ?.emailAddress || '',
                },

                // -------------------------------
                // Payment Success
                // -------------------------------
                handler: async function (
                    response
                ) {
                    setActivating(true);

                    try {
                        const verifyRes =
                            await fetch(
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
                            await safeJsonParse(
                                verifyRes
                            );

                        if (!verifyRes.ok) {
                            throw new Error(
                                verifyData.error ||
                                'Payment verification failed'
                            );
                        }

                        // -------------------------------
                        // Update User
                        // -------------------------------
                        if (verifyData.user) {
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

                        // -------------------------------
                        // Wait For Activation
                        // -------------------------------
                        const confirmed =
                            await waitForPlanActivation(
                                getToken,
                                requiredMode
                            );

                        if (confirmed) {
                            setSuccess(true);
                        } else {
                            setError(
                                'Payment received but activation is taking longer than expected. Please refresh shortly.'
                            );
                        }
                    } catch (error) {
                        console.error(error);

                        setError(
                            error.message ||
                            'Payment verification failed'
                        );
                    } finally {
                        setActivating(false);
                    }
                },
            };

            // -------------------------------
            // Open Razorpay
            // -------------------------------
            const razorpay =
                new window.Razorpay(options);

            razorpay.on(
                'payment.failed',
                function (response) {
                    setError(
                        response.error
                            ?.description ||
                        'Payment Failed'
                    );
                }
            );

            razorpay.open();
        } catch (error) {
            console.error(error);

            setError(
                error.message ||
                'Payment failed'
            );
        } finally {
            setLoading(false);
        }
    };

    // ===============================
    // Activating State
    // ===============================
    if (activating) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <p className="text-lg font-semibold">
                    Activating your plan...
                </p>
            </div>
        );
    }

    // ===============================
    // Success State
    // ===============================
    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <CheckCircle2
                    size={60}
                    className="text-green-500 mb-4"
                />

                <h2 className="text-2xl font-bold">
                    Payment Successful
                </h2>

                <p className="text-slate-500 mt-2">
                    Your {requiredMode} plan
                    is now active.
                </p>
            </div>
        );
    }

    // ===============================
    // Main UI
    // ===============================
    return (
        <div className="flex flex-col items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border border-slate-200">
                <div className="flex justify-center mb-6">
                    {isFull ? (
                        <Crown
                            size={48}
                            className="text-purple-500"
                        />
                    ) : (
                        <Lock
                            size={48}
                            className="text-indigo-500"
                        />
                    )}
                </div>

                <h2 className="text-3xl font-bold text-center mb-2">
                    Unlock {feature}
                </h2>

                <p className="text-center text-slate-500 mb-6">
                    {requiredMode} Plan Required
                </p>

                <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <span className="font-medium">
                            Lifetime Access
                        </span>

                        <span className="text-2xl font-bold">
                            ₹{amount}
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-sm mb-6 flex items-start gap-2">
                        <ShieldCheck
                            size={18}
                            className="mt-0.5"
                        />

                        <span>{error}</span>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handlePayment}
                    disabled={loading}
                    className={`w-full text-white font-bold py-4 rounded-xl transition-all ${isFull
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                >
                    {loading
                        ? 'Processing...'
                        : isFull
                            ? 'Unlock Full Access'
                            : 'Upgrade to Pro'}
                </button>

                <p className="text-center text-xs text-slate-400 mt-4">
                    Secure payment powered by
                    Razorpay
                </p>
            </div>
        </div>
    );
}