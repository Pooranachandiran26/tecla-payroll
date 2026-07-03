import { Link, usePage } from '@inertiajs/react';
import { adminNav, clientNav, candidateNav, subNavs, roleUserInfo, getActiveCategory } from '../Constants/navigation';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import ToastContainer from '../Components/ui/Toast';
import { useRole } from '../Contexts/RoleContext.jsx';

export default function AuthenticatedLayout({ children }) {
  const { url } = usePage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Use shared role context — syncs across all pages
  const { role, setRole } = useRole();
  const userInfo = roleUserInfo[role];
  
  const navLinks = role === 'client' ? clientNav
    : role === 'candidate' ? candidateNav
    : adminNav;

  const activeCategory = getActiveCategory(url, role);
  
  // Get subnav items if any exist for the active category
  const subNavItems = (role === 'admin' || role === 'executive') ? subNavs[activeCategory] : null;

  return (
    <div className="app-container">
      <header className="app-header">
        {/* Primary Nav Row */}
        <div className="nav-row-primary">
          <div className="brand-section">
            <button 
              className="hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={24} />
            </button>
            <div className="brand-logo">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M12 2L2 22h20L12 2zm0 6l5 10H7l5-10z"/>
              </svg>
              Tecla Payroll
            </div>
          </div>

          <nav className={`nav-links-primary ${mobileMenuOpen ? 'active' : ''}`}>
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.url}
                className={activeCategory === link.key ? 'active' : ''}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="user-actions">
            <button className="notif-bell">
              <Bell size={20} />
              <span className="notif-badge">3</span>
            </button>
            
              <div className="role-switcher-container">
                <span className="role-label">View As:</span>
                <select 
                  className="nav-dropdown"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="executive">Executive</option>
                  <option value="client">Client</option>
                  <option value="candidate">Employee</option>
                </select>
              </div>

            <div className="user-profile-menu">
              <div className="avatar" title={userInfo.label}>
                {userInfo.label.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 600 }}>{userInfo.label}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{userInfo.roleLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Sub-Nav Row */}
        {subNavItems && (
          <div className="nav-row-secondary">
            <ul className="sub-nav-tabs">
              {subNavItems.map((item, index) => {
                let isActive = false;
                  if (url === item.url) {
                    isActive = true;
                  } else if (item.url !== '/' && url.startsWith(item.url + '/')) {
                    const betterMatch = subNavItems.find(other => url.startsWith(other.url) && other.url.length > item.url.length);
                    if (!betterMatch) {
                      isActive = true;
                    }
                  }
                return (
                  <li key={index}>
                    <Link href={item.url} className={isActive ? 'active' : ''}>
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </header>

      <main className="main-content">
        {children}
      </main>

      <ToastContainer />
    </div>
  );
}
