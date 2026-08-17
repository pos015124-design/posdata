import type { LucideIcon } from 'lucide-react';

export interface SettingsTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SettingsTabsProps {
  tabs: SettingsTab[];
  activeId: string;
  onSelect: (id: string) => void;
}

/**
 * Unified horizontal scrollable tab bar used by both the seller and
 * super-admin settings pages. Replaces the stacked vertical lists and
 * mobile dropdown so navigation stays consistent on every screen size.
 */
export default function SettingsTabs({ tabs, activeId, onSelect }: SettingsTabsProps) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto pb-1 -mb-1"
      role="tablist"
      aria-label="Settings sections"
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.id)}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              active
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
