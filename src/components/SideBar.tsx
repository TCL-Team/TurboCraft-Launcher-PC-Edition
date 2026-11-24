import React, { useState } from 'react';
import { Gauge, Layers, Info, Users, ChevronRight, ChevronLeft } from 'lucide-react';
import { t } from '../theme/i18n';

interface SideBarProps {
  language: 'en' | 'hi';
  onPerformanceClick: () => void;
  onVersionsClick: () => void;
  onAboutClick: () => void;
  onTeamClick: () => void;
}

/**
 * Exact bouncy frosted-glass collapsible SideBar ported from `ui/screens/content/elements/SideBar.kt`
 */
export const SideBar: React.FC<SideBarProps> = ({
  language,
  onPerformanceClick,
  onVersionsClick,
  onAboutClick,
  onTeamClick,
}) => {
  const [expanded, setExpanded] = useState(true);

  const items = [
    {
      icon: <Gauge size={20} />,
      label: t(language, 'sidePerformance'),
      onClick: onPerformanceClick,
    },
    {
      icon: <Layers size={20} />,
      label: t(language, 'sideVersions'),
      onClick: onVersionsClick,
    },
    {
      icon: <Info size={20} />,
      label: t(language, 'sideAbout'),
      onClick: onAboutClick,
    },
    {
      icon: <Users size={20} />,
      label: t(language, 'sideTeam'),
      onClick: onTeamClick,
    },
  ];

  return (
    <aside
      className="tcl-glass-card"
      style={{
        width: expanded ? 104 : 52,
        borderRadius: 22,
        padding: '12px 6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'width 0.34s cubic-bezier(0.34, 1.56, 0.64, 1)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: '100%',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '65%',
            height: 1,
            background: 'rgba(255,255,255,0.14)',
            marginBottom: 4,
          }}
        />
        {items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={item.onClick}
            title={item.label}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: 16,
              padding: expanded ? '10px 6px' : '10px 0',
              background: 'transparent',
              color: 'var(--on-surface)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer',
              transition: 'background 0.18s ease, transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ color: 'var(--primary)', display: 'flex' }}>{item.icon}</span>
            {expanded && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textAlign: 'center',
                  lineHeight: 1.15,
                  opacity: 0.9,
                }}
              >
                {item.label}
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        title={expanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
        className="tcl-icon-btn"
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.07)',
        }}
      >
        {expanded ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
      </button>
    </aside>
  );
};
