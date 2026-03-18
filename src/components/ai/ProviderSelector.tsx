import React, { useState } from 'react';
import { AIProviderType, CostEstimate, ProviderHealth, SessionUsage } from '../../types';
import { formatCost, formatTokenCount, getProviderPricing } from '../../utils/token-estimator';

interface ProviderSelectorProps {
  activeProvider: AIProviderType;
  isOnline: boolean;
  providerHealth: Record<string, ProviderHealth>;
  costEstimate: CostEstimate | null;
  sessionUsage: SessionUsage;
  onProviderChange: (provider: AIProviderType) => void;
}

const PROVIDER_OPTIONS = [
  { id: 'claude' as AIProviderType, label: 'Claude', model: 'claude-sonnet-4' },
  { id: 'gemini' as AIProviderType, label: 'Gemini', model: 'gemini-2.5-pro' },
  { id: 'openai' as AIProviderType, label: 'GPT-4o', model: 'gpt-4o' },
];

function HealthDot({
  health,
  isOnline,
}: {
  health: ProviderHealth | undefined;
  isOnline: boolean;
}) {
  let color = 'bg-gray-500';
  if (!isOnline) {
    color = 'bg-gray-500';
  } else if (health) {
    color = health.isHealthy ? 'bg-green-400' : 'bg-red-400';
  }
  return <span className={`w-1.5 h-1.5 rounded-full ${color} inline-block flex-shrink-0`} />;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  activeProvider,
  isOnline,
  providerHealth,
  costEstimate,
  sessionUsage,
  onProviderChange,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const activeOption = PROVIDER_OPTIONS.find((p) => p.id === activeProvider);
  const activeHealth =
    typeof activeProvider === 'string' ? providerHealth[activeProvider] : undefined;

  // Cost display: show pending cost estimate or accumulated session tokens
  const costDisplay = costEstimate
    ? `~${formatCost(costEstimate.estimatedCostUsd)}`
    : sessionUsage.totalTokensUsed > 0
    ? `${formatTokenCount(sessionUsage.totalTokensUsed)} tok`
    : null;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 text-xs">
      {/* Provider selector button + dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown((prev) => !prev)}
          className="flex items-center gap-1.5 text-gray-300 hover:text-gray-100 px-1.5 py-0.5 rounded hover:bg-gray-700"
        >
          <HealthDot health={activeHealth} isOnline={isOnline} />
          <span>{activeOption?.label ?? 'Unknown'}</span>
          {activeOption && (
            <span className="text-[10px] text-gray-500">{activeOption.model}</span>
          )}
          {!isOnline && (
            <span className="text-[9px] bg-gray-600 text-gray-400 px-1 py-0.5 rounded uppercase">
              Offline
            </span>
          )}
          <span className="text-[10px] text-gray-500">&#9660;</span>
        </button>

        {showDropdown && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute left-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded shadow-lg z-50 min-w-[220px]">
              {PROVIDER_OPTIONS.map((p) => {
                const health =
                  typeof p.id === 'string' ? providerHealth[p.id] : undefined;
                const pricing =
                  typeof p.id === 'string' ? getProviderPricing(p.id) : null;
                const isActive = p.id === activeProvider;

                return (
                  <button
                    key={typeof p.id === 'string' ? p.id : 'plugin'}
                    onClick={() => {
                      onProviderChange(p.id);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-600 flex items-center gap-2 ${
                      isActive ? 'text-blue-400' : 'text-gray-300'
                    }`}
                  >
                    <HealthDot health={health} isOnline={isOnline} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{p.label}</span>
                        <span className="text-[10px] text-gray-500 truncate">{p.model}</span>
                      </div>
                      {pricing && (
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          ${(pricing.inputPer1M / 1000).toFixed(4)}/1k in &middot; $
                          {(pricing.outputPer1M / 1000).toFixed(4)}/1k out
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <span className="text-blue-400 text-[10px] flex-shrink-0">&#10003;</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Cost / token usage badge */}
      {costDisplay && (
        <div className="relative">
          <button
            className="text-gray-400 hover:text-gray-200 px-1.5 py-0.5 rounded hover:bg-gray-700"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            {costDisplay}
          </button>

          {showTooltip && (
            <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-600 rounded shadow-lg z-50 p-2 min-w-[180px]">
              <p className="text-[10px] text-gray-400 mb-1 font-semibold">Session Usage</p>
              {Object.entries(sessionUsage.providerBreakdown).map(([provider, data]) => (
                <div key={provider} className="flex justify-between text-[10px] text-gray-300 mb-0.5">
                  <span className="capitalize">{provider}</span>
                  <span>
                    {formatTokenCount(data.tokens)} &middot; {formatCost(data.costUsd)}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-700 mt-1 pt-1 flex justify-between text-[10px] text-gray-200 font-medium">
                <span>Total</span>
                <span>{formatCost(sessionUsage.estimatedTotalCostUsd)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProviderSelector;
