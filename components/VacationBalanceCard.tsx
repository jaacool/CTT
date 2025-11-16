import React from 'react';
import { VacationBalance } from '../types';
import { getTotalAvailableDays } from '../utils/vacationCalculations';

interface VacationBalanceCardProps {
  balance: VacationBalance;
  compact?: boolean;
}

export const VacationBalanceCard: React.FC<VacationBalanceCardProps> = ({ balance, compact = false }) => {
  const totalAvailable = getTotalAvailableDays(balance);
  const usagePercentage = (balance.used / balance.totalEntitlement) * 100;

  if (compact) {
    return (
      <div className="bg-background border border-overlay rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-secondary">Urlaubstage {balance.year}</span>
          <span className="text-lg font-bold text-text-primary">
            {totalAvailable.toFixed(1)} <span className="text-sm font-normal text-text-secondary">verfügbar</span>
          </span>
        </div>
        <div className="w-full bg-overlay rounded-full h-2">
          <div
            className="bg-glow-purple h-2 rounded-full transition-all"
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="glow-card rounded-xl p-6 border border-overlay">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Urlaubsbilanz {balance.year}</span>
        </h3>
      </div>

      {/* Hauptstatistik */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-background rounded-lg p-4 border border-overlay">
          <div className="text-sm text-text-secondary mb-1">Gesamtanspruch</div>
          <div className="text-2xl font-bold text-text-primary">{balance.totalEntitlement}</div>
          <div className="text-xs text-text-secondary">Tage</div>
        </div>
        
        <div className="bg-background rounded-lg p-4 border border-glow-purple">
          <div className="text-sm text-text-secondary mb-1">Verfügbar</div>
          <div className="text-2xl font-bold text-glow-purple">{totalAvailable.toFixed(1)}</div>
          <div className="text-xs text-text-secondary">Tage (inkl. Ausgleich)</div>
        </div>
      </div>

      {/* Detailstatistik */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Genommen</span>
          <span className="text-sm font-semibold text-text-primary">{balance.used} Tage</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Beantragt (ausstehend)</span>
          <span className="text-sm font-semibold text-yellow-500">{balance.pending} Tage</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Verbleibender Urlaub</span>
          <span className="text-sm font-semibold text-text-primary">{balance.available.toFixed(1)} Tage</span>
        </div>

        {/* Überstunden */}
        {balance.overtimeHours !== 0 && (
          <>
            <div className="border-t border-overlay pt-3 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>{balance.overtimeHours >= 0 ? 'Überstunden' : 'Minderstunden'}</span>
                </span>
                <span className={`text-sm font-semibold ${balance.overtimeHours >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {balance.overtimeHours >= 0 ? '+' : ''}{balance.overtimeHours.toFixed(1)} h
                </span>
              </div>
              
              {balance.overtimeHours > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">≈ Ausgleichstage</span>
                  <span className="text-xs font-semibold text-green-500">
                    +{balance.overtimeDaysEquivalent.toFixed(1)} Tage
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Fortschrittsbalken */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
          <span>Nutzung</span>
          <span>{usagePercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-overlay rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 70 ? 'bg-yellow-500' : 'bg-glow-purple'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
