import { Link, usePage } from '@inertiajs/react';
import { adminNav, clientNav, candidateNav, subNavs, getActiveCategory, getPathname } from '../Constants/navigation';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import ToastContainer from '../Components/ui/Toast';
import { useRole } from '../Contexts/RoleContext.jsx';

export default function AuthenticatedLayout({ children }) {
  const { url } = usePage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Use auth and branding from usePage().props
  const { auth, branding } = usePage().props;
  const role = auth?.user?.role || 'guest';
  const userName = auth?.user?.name || 'User';
  
  const navLinks = role === 'client' ? clientNav
    : role === 'employee' ? candidateNav
    : adminNav;

  const activeCategory = getActiveCategory(url, role);
  
  // Get subnav items if any exist for the active category
  const subNavItems = (role === 'admin' || role === 'manager') ? subNavs[activeCategory] : null;

  const [dropdownOpen, setDropdownOpen] = useState(false);

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
              {branding?.logo_url ? (
                <img src={branding.logo_url} alt="Agency Logo" style={{ maxHeight: '32px', maxWidth: '140px', objectFit: 'contain' }} />
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path d="M12 2L2 22h20L12 2zm0 6l5 10H7l5-10z"/>
                  </svg>
                  Tecla Payroll
                </>
              )}
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
            
            <div className="user-profile-menu" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setDropdownOpen(!dropdownOpen)}>
              <div className="avatar" title={userName}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 600 }}>{userName}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>{role}</span>
              </div>

              {dropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: 'white', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', minWidth: '150px', zIndex: 100 }}>
                  <Link href={route('account.sessions')} style={{ display: 'block', padding: '0.5rem 1rem', color: '#333', textDecoration: 'none', borderBottom: '1px solid #eee' }}>My Sessions</Link>
                  <Link href={route('logout')} method="post" as="button" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', color: '#dc2626', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}>Sign Out</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Sub-Nav Row */}
        {subNavItems && (
          <div className="nav-row-secondary">
            <ul className="sub-nav-tabs">
              {subNavItems.map((item, index) => {
                let isActive = false;
                const itemPath = getPathname(item.url);
                const currentPath = getPathname(url);
                
                if (currentPath === itemPath) {
                  isActive = true;
                } else if (itemPath !== '/' && itemPath !== '' && currentPath.startsWith(itemPath + '/')) {
                  const betterMatch = subNavItems.find(other => {
                    const otherPath = getPathname(other.url);
                    return currentPath.startsWith(otherPath) && otherPath.length > itemPath.length;
                  });
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
