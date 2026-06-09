import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, ShieldAlert, TrendingUp, Building2, ClipboardList, Activity, ShieldCheck } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/complaints', label: 'Complaint Map', icon: Map },
    { path: '/safety', label: 'Safety Incidents', icon: ShieldAlert },
    { path: '/demand', label: 'Demand Forecast', icon: TrendingUp },
    { path: '/station', label: 'Station Status', icon: Building2 },
    { path: '/grievance', label: 'Grievance Portal', icon: ClipboardList },
    { path: '/heatmap', label: 'Live Heatmaps', icon: Activity },
    { path: '/rpf', label: 'RPF Dashboard', icon: ShieldCheck },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Brand Logo Header */}
      <div style={styles.logoContainer}>
        <span style={styles.logoIcon}>🚆</span>
        <h2 style={styles.logoText}>
          <span style={styles.logoRail}>Rail</span>
          <span style={styles.logoSaathi}>Saathi</span>
        </h2>
      </div>

      {/* Navigation List */}
      <nav style={styles.nav}>
        <ul style={styles.navList}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  style={({ isActive }) => ({
                    ...styles.navLink,
                    ...(isActive ? styles.navLinkActive : {}),
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <IconComponent
                        size={18}
                        style={{
                          marginRight: '12px',
                          color: isActive ? 'var(--color-orange)' : 'var(--color-text-secondary)',
                        }}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    backgroundColor: 'var(--color-white)',
    borderRight: '1px solid var(--color-divider)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
  },
  logoContainer: {
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-divider)',
  },
  logoIcon: {
    fontSize: '22px',
    marginRight: '10px',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '700',
    display: 'flex',
  },
  logoRail: {
    color: 'var(--color-navy)',
  },
  logoSaathi: {
    color: 'var(--color-orange)',
  },
  nav: {
    flex: 1,
    padding: '20px 0',
  },
  navList: {
    listStyleType: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px 12px 17px', // padding left is 17px to account for 3px active border offset
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--color-text-secondary)',
    borderLeft: '3px solid transparent',
    transition: 'background-color 150ms ease, color 150ms ease',
  },
  navLinkActive: {
    backgroundColor: '#FFF3EC',
    color: 'var(--color-orange)',
    fontWeight: '700',
    borderLeft: '3px solid var(--color-orange)',
  },
};
