/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lock, Sparkles, Check, Zap } from 'lucide-react';
import { FeatureGate, SUBSCRIPTION_PLANS } from '../../lib/subscriptionConfig';
import { Button } from './Button';

interface LockedFeatureOverlayProps {
  gate: FeatureGate;
  onUpgradeClick: () => void;
  children: React.ReactNode;
  allowed: boolean;
}

export default function LockedFeatureOverlay({ 
  gate, 
  onUpgradeClick, 
  children, 
  allowed 
}: LockedFeatureOverlayProps) {
  if (allowed) {
    return <>{children}</>;
  }

  const requiredPlanDetail = SUBSCRIPTION_PLANS[gate.requiredPlan];

  return (
    <div className="relative overflow-hidden rounded-2xl group border border-white/5">
      {/* Blurred background preview of the feature */}
      <div className="filter blur-md opacity-25 pointer-events-none select-none">
        {children}
      </div>

      {/* Absolutely positioned beautiful glassmorphism card overlay */}
      <div className="absolute inset-0 bg-[#0a0a0ab0] backdrop-blur-[4px] flex flex-col justify-center items-center p-6 text-center animate-fadeIn z-10">
        <div className="max-w-md space-y-4">
          
          {/* Locked Badge */}
          <div className="mx-auto w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-950 to-[#00E5FF]/20 border border-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.1)]">
            <Lock className="w-4 h-4" />
          </div>

          <div className="space-y-1">
            <span className="text-[9px] uppercase font-mono tracking-widest text-[#00E5FF] font-bold">
              Premium Module • Requires {requiredPlanDetail?.name || gate.requiredPlan}
            </span>
            <h4 className="text-base font-semibold text-white font-display tracking-tight">
              {gate.name}
            </h4>
            <p className="text-xs text-[#a0a0a0] leading-relaxed">
              {gate.description}
            </p>
          </div>

          {/* Benefits Bullet Points */}
          {gate.benefits && gate.benefits.length > 0 && (
            <div className="bg-[#111315]/80 border border-white/5 p-3 rounded-xl text-left space-y-1.5 text-[10px] text-[#B5B8BE]">
              <span className="font-mono text-[9px] text-[#888] uppercase block font-bold">What you unlock:</span>
              {gate.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-[#00E5FF] mt-0.5 flex-shrink-0" />
                  <span className="leading-tight">{benefit}</span>
                </div>
              ))}
            </div>
          )}

          {/* Example Scenario */}
          {gate.examples && gate.examples.length > 0 && (
            <div className="text-left text-[10px] text-[#888] italic px-1">
              <span className="font-semibold text-white/50 not-italic">Example: </span>
              "{gate.examples[0]}"
            </div>
          )}

          {/* CTA Trigger */}
          <div className="pt-2">
            <button
              onClick={onUpgradeClick}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black font-semibold text-xs transition shadow-[0_0_20px_rgba(0,229,255,0.15)] flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Unlock Advanced Intelligence</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
