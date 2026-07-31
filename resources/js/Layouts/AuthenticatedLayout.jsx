import { Link, usePage, router } from '@inertiajs/react';
import { adminNav, clientNav, candidateNav, subNavs, getActiveCategory, getPathname } from '../Constants/navigation';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import ToastContainer from '../Components/ui/Toast';
import { useRole } from '../Contexts/RoleContext.jsx';
import useToast from '../Hooks/useToast';
import NotificationPanel from '../Components/NotificationPanel';


export default function AuthenticatedLayout({ children, hideSubNav = false }) {
  const { url, component } = usePage();
  const isErrorPage = component === 'Error' || hideSubNav;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Use auth, branding, flash, and pendingQueryCount from usePage().props
  const { auth, branding, flash, notificationCount } = usePage().props;
  const unreadCount = Number(notificationCount || 0);

  const { showToast } = useToast();
  const role = auth?.user?.role || 'guest';
  const userName = auth?.user?.name || 'User';

  const handleFlash = useCallback((flashObj) => {
    if (flashObj?.success) {
      showToast({ type: 'success', message: flashObj.success });
    }
    if (flashObj?.error) {
      showToast({ type: 'error', message: flashObj.error });
    }
    if (flashObj?.warning) {
      showToast({ type: 'warning', message: flashObj.warning });
    }
    if (flashObj?.info) {
      showToast({ type: 'info', message: flashObj.info });
    }
  }, [showToast]);

  useEffect(() => {
    handleFlash(flash);
  }, []);

  useEffect(() => {
    const preventWheelChange = (e) => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', preventWheelChange, { passive: true });
    return () => {
      window.removeEventListener('wheel', preventWheelChange);
    };
  }, []);

  useEffect(() => {
    const removeListener = router.on('success', (event) => {
      const latestFlash = event.detail.page?.props?.flash;
      if (latestFlash) {
        handleFlash(latestFlash);
      }
    });

    return () => {
      removeListener();
    };
  }, [handleFlash]);
  
  const userPermissions = auth?.user?.module_permissions;

  const rawNavLinks = (role === 'client' ? clientNav
    : role === 'employee' ? candidateNav
    : adminNav) || [];

  const safeRawLinks = Array.isArray(rawNavLinks) ? rawNavLinks : [];

  const navLinks = safeRawLinks.filter(item => {
    if (!item) return false;
    if (role === 'admin') return true;
    if (role === 'manager' && Array.isArray(userPermissions) && userPermissions.length > 0) {
      return userPermissions.includes(item.key);
    }
    return true;
  });

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
                prefetch
                className={activeCategory === link.key ? 'active' : ''}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="user-actions">
            {/* Notification Bell — fully wired via NotificationPanel */}
            {(role === 'admin' || role === 'manager') && (
              <NotificationPanel unreadCount={unreadCount} />
            )}

            
            <div className="user-profile-menu" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setDropdownOpen(!dropdownOpen)}>
              <div className="avatar" title={userName}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 600 }}>{userName}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>{role}</span>
              </div>

              {dropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: 'white', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.12)', minWidth: '180px', zIndex: 100, overflow: 'hidden' }}>
                  <Link href="/account/profile" style={{ display: 'block', padding: '0.625rem 1rem', color: '#1e293b', textDecoration: 'none', borderBottom: '1px solid #f1f5f9', fontWeight: 500, fontSize: '0.85rem' }}>My Profile & Security</Link>
                  <Link href={route('account.sessions')} style={{ display: 'block', padding: '0.625rem 1rem', color: '#1e293b', textDecoration: 'none', borderBottom: '1px solid #f1f5f9', fontWeight: 500, fontSize: '0.85rem' }}>Active Sessions</Link>
                  <Link href={route('logout')} method="post" as="button" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.625rem 1rem', color: '#dc2626', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Sign Out</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Sub-Nav Row */}
        {!isErrorPage && subNavItems && (
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
                    <Link href={item.url} prefetch className={isActive ? 'active' : ''}>
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
