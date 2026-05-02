import React, { useState } from 'react';
import UpgradeDialog from './UpgradeDialog';
import { hasAccess } from '../../utils/accessControl';

const PremiumFeatureWrapper = ({ feature, requiredRole, currentRole, children }) => {
    const [showDialog, setShowDialog] = useState(true);

    if (hasAccess(currentRole, requiredRole)) {
        return children;
    }

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
};

export default PremiumFeatureWrapper;
