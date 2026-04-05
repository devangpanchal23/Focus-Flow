import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import UpgradeDialog from './UpgradeDialog';

const PremiumFeatureWrapper = ({ feature, requiredRole, children }) => {
    const { currentUser } = useAuth();
    const [showDialog, setShowDialog] = useState(true);

    if (currentUser?.role === 'admin' || currentUser?.role === 'moderator') {
        return children;
    }

    const requiresFull = requiredRole === 'full';
    let hasAccess = false;

    if (requiresFull) {
        hasAccess = !!currentUser?.hasFullAccess;
    } else {
        hasAccess = !!currentUser?.hasPro;
    }

    if (!hasAccess) {
        return (
            <UpgradeDialog
                isOpen={showDialog}
                featureName={feature}
                onClose={() => {
                    setShowDialog(false);
                    // Usually we dispatch an event to go back to dashboard
                    window.dispatchEvent(new CustomEvent('navigate_dashboard'));
                }}
                onUpgrade={() => {
                    setShowDialog(false);
                    // Navigate to settings page where Centralized Payment System is
                    window.dispatchEvent(new CustomEvent('navigate_settings'));
                }}
            />
        );
    }

    return children;
};

export default PremiumFeatureWrapper;
