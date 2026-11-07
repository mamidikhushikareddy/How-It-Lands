/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FeatureGate } from '../../lib/subscriptionConfig';

interface LockedFeatureOverlayProps {
  gate?: FeatureGate;
  onUpgradeClick?: () => void;
  children: React.ReactNode;
  allowed?: boolean;
}

/**
 * LockedFeatureOverlay: All features are accessible and free to use.
 * Renders children cleanly without any paywall, blur, or lock overlay.
 */
export default function LockedFeatureOverlay({ 
  children 
}: LockedFeatureOverlayProps) {
  return <>{children}</>;
}
