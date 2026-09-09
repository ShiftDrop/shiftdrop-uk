import React from 'react';
import {
  Home,
  Navigation,
  Box,
  RotateCcw,
  Radar,
  Car,
  ShieldAlert,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Globe,
  Activity,
  Key,
  Calculator,
} from 'lucide-react';
import { Crown } from 'lucide-react';
import { ActiveModuleId } from '../types';

interface SidebarNavProps {
  activeModule: ActiveModuleId;
  onSelectModule: (moduleId: ActiveModuleId) => void;
  isCollapsedDesktop: boolean;
  onToggleCollapseDesktop: () => void;
  pendingDropsCount: number;
  returnsCount: number;
  isOpenMobileSidebar?: boolean;
  onCloseMobileSidebar?: () => void;
}

interface NavItem {
  id: ActiveModuleId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
  category?: string;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeModule,
  onSelectModule,
  isCollapsedDesktop,
  onToggleCollapseDesktop,
  pendingDropsCount,
  returnsCount,
  isOpenMobileSidebar,
  onCloseMobileSidebar,
}) => {
  const navItems: NavItem[] = [
    {
      id: 'hub',
      label: 'In-Cab Home Hub',
      shortLabel: 'Hub',
      icon: Home,
      category: 'Dispatch & Ops',
    },
    {
      id: 'hud',
      label: 'Active Cab HUD',
      shortLabel: 'In-Cab HUD',
      icon: Navigation,
      badge: pendingDropsCount > 0 ? `${pendingDropsCount}` : undefined,
      badgeColor: 'bg-brand-cyan text-canvas',
      category: 'Dispatch & Ops',
    },
    {
      id: 'realtime',
      label: 'Live Earnings Stream',
      shortLabel: 'Pay Stream',
      icon: Activity,
      category: 'Dispatch & Ops',
    },
    {
      id: 'loadin',
      label: 'Spatial Load-In',
      shortLabel: 'Load-In',
      icon: Box,
      category: 'Dispatch & Ops',
    },
    {
      id: 'doorstep',
      label: 'Doorstep Intel Vault',
      shortLabel: 'Doorstep Intel',
      icon: Key,
      badge: 'UK',
      badgeColor: 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40',
      category: 'Dispatch & Ops',
    },
    {
      id: 'returns',
      label: 'Depot Returns',
      shortLabel: 'Returns',
      icon: RotateCcw,
      badge: returnsCount > 0 ? returnsCount : undefined,
      badgeColor: 'bg-red-500 text-white',
      category: 'Dispatch & Ops',
    },
    {
      id: 'calculator',
      label: 'Shift Profit Calculator',
      shortLabel: 'Profit Engine',
      icon: Calculator,
      badge: 'PROFIT',
      badgeColor: 'bg-brand-emerald/20 text-brand-emerald border border-brand-emerald/40',
      category: 'Financial & Fleet',
    },
    {
      id: 'radar',
      label: 'Pay Radar & Surge',
      shortLabel: 'Pay Radar',
      icon: Radar,
      category: 'Financial & Fleet',
    },
    {
      id: 'garage',
      label: 'Vehicle Fleet & Garage',
      shortLabel: 'Garage',
      icon: Car,
      category: 'Financial & Fleet',
    },
    {
      id: 'pcn',
      label: 'PCN Shield & Appeals',
      shortLabel: 'PCN Shield',
      icon: ShieldAlert,
      category: 'Financial & Fleet',
    },
    {
      id: 'hmrc',
      label: 'HMRC Tax Vault',
      shortLabel: 'HMRC Vault',
      icon: FileSpreadsheet,
      category: 'Financial & Fleet',
    },
    {
      id: 'settings',
      label: 'Driver Preferences',
      shortLabel: 'Settings',
      icon: Settings,
      category: 'System & Portal',
    },
    {
      id: 'pro',
      label: 'Upgrade to PRO',
      shortLabel: 'PRO',
      icon: Crown,
      category: 'System & Portal',
      badge: 'NEW',
      badgeColor: 'bg-brand-amber text-white border-brand-amber',
    }
  ];

  return (
    <>
      {/* Mobile/Tablet Overlay */}
      {isOpenMobileSidebar && (
        <div 
          className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-navigation-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 bg-surface border-r border-subtle transition-transform duration-300 select-none 
          lg:relative lg:translate-x-0 ${
          isOpenMobileSidebar ? 'translate-x-0' : '-translate-x-full'
        } ${
          isCollapsedDesktop ? 'lg:w-16' : 'w-64 lg:w-60'
        }`}
      >
        {/* Sidebar Top: Compact Collapse Toggle */}
        <div className="flex items-center justify-between p-3 border-b border-subtle h-14 sm:h-16">
          {(!isCollapsedDesktop || !isOpenMobileSidebar) && (
            <div className={`flex items-center gap-2 overflow-hidden px-1 ${isCollapsedDesktop ? 'lg:hidden' : ''}`}>
              <span className="text-[11px] font-mono uppercase tracking-wider text-secondary font-bold truncate">
                Workstation
              </span>
            </div>
          )}
          
          {/* Close button on mobile/tablet */}
          <button
            onClick={onCloseMobileSidebar}
            className="p-1.5 rounded-lg bg-inset text-secondary hover:text-brand-cyan hover:bg-subtle border border-subtle transition-colors lg:hidden ml-auto"
            aria-label="Close Sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            id="btn-toggle-desktop-collapse"
            onClick={onToggleCollapseDesktop}
            className={`hidden lg:flex p-1.5 rounded-lg bg-inset text-secondary hover:text-brand-cyan hover:bg-subtle border border-subtle transition-colors ${
              isCollapsedDesktop ? 'mx-auto' : 'ml-auto'
            }`}
            title={isCollapsedDesktop ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label="Toggle Sidebar Collapse"
          >
            {isCollapsedDesktop ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Item List */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            
            // On mobile/tablet, it's never collapsed
            const isItemCollapsed = isCollapsedDesktop;

            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => {
                  onSelectModule(item.id);
                  if (onCloseMobileSidebar) onCloseMobileSidebar();
                }}
                className={`flex items-center rounded-xl transition-all relative group ${
                  isItemCollapsed
                    ? 'lg:w-12 lg:h-12 lg:mx-auto lg:justify-center lg:p-0 w-full px-3 py-3 min-h-11 gap-3 text-left'
                    : 'w-full px-3 py-3 min-h-11 gap-3 text-left'
                } ${
                  isActive
                    ? 'bg-subtle text-brand-cyan font-bold border border-brand-cyan/40 shadow-sm'
                    : 'text-secondary hover:bg-subtle/60 hover:text-primary border border-transparent'
                }`}
                title={isItemCollapsed ? item.label : undefined}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon className="w-5 h-5 lg:w-4 lg:h-4" />
                  {isItemCollapsed && item.badge && (
                    <span className="hidden lg:flex absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[9px] font-mono font-bold bg-brand-cyan text-canvas">
                      {item.badge}
                    </span>
                  )}
                </div>

                <div className={`flex-1 flex items-center justify-between overflow-hidden text-sm lg:text-xs ${isItemCollapsed ? 'lg:hidden' : ''}`}>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ml-1 shrink-0 ${
                        item.badgeColor || 'bg-inset text-primary border border-subtle'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Tooltip on collapsed desktop/tablet rail */}
                {isItemCollapsed && (
                  <div className="hidden lg:block fixed left-20 px-2.5 py-1.5 bg-surface text-primary text-xs rounded-lg shadow-2xl border border-subtle whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 font-sans">
                    {item.label}
                    {item.badge && (
                      <span className="ml-1.5 px-1 py-0.5 rounded bg-brand-cyan text-canvas font-bold text-[10px]">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 lg:p-2.5 border-t border-subtle bg-inset">
          <div className={`text-center ${isCollapsedDesktop ? 'lg:hidden' : ''}`}>
            <div className="flex items-center justify-center gap-1 text-xs lg:text-[11px] font-mono text-secondary">
              <span>ShiftDrop</span>
              <span className="text-brand-emerald font-bold">UK</span>
            </div>
            <p className="text-[10px] lg:text-[9px] text-secondary/60 truncate mt-0.5">
              HMRC AMAP Engine
            </p>
          </div>
          {isCollapsedDesktop && (
            <div className="hidden lg:flex justify-center text-[10px] text-brand-cyan font-mono font-bold">
              PRO
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
