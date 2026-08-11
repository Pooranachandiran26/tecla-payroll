import { Link, usePage, router } from '@inertiajs/react';
import { adminNav, clientNav, candidateNav, subNavs, getActiveCategory, getPathname, isSubNavAuthorized } from '../Constants/navigation';
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
  const { auth, branding, flash, notificationCount, activeClients, activeClientId } = usePage().props;
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
  }, [flash, handleFlash]);

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

  // For managers: compute which sub-nav items are allowed per parent module,
  // then hide parent modules with zero allowed sub-tabs & rewrite header URLs
  // to point to the first allowed sub-tab.
  const navLinks = safeRawLinks
    .filter(item => {
      if (!item) return false;
      if (role === 'admin') return true;
      if (role === 'manager' && Array.isArray(userPermissions) && userPermissions.length > 0) {
        if (!userPermissions.includes(item.key)) return false;
        // If this parent has sub-nav items, check if at least one is allowed
        const parentSubNavs = subNavs[item.key];
        if (parentSubNavs && parentSubNavs.length > 0) {
          const allowedSubs = parentSubNavs.filter(sub =>
            isSubNavAuthorized(sub, item.key, userPermissions, role)
          );
          if (allowedSubs.length === 0) return false;
        }
        return true;
      }
      return true;
    })
    .map(item => {
      // For managers, rewrite the header URL to the first allowed sub-tab
      if (role === 'manager' && Array.isArray(userPermissions) && userPermissions.length > 0) {
        const parentSubNavs = subNavs[item.key];
        if (parentSubNavs && parentSubNavs.length > 0) {
          const allowedSubs = parentSubNavs.filter(sub =>
            isSubNavAuthorized(sub, item.key, userPermissions, role)
          );
          if (allowedSubs.length > 0) {
            return { ...item, url: allowedSubs[0].url };
          }
        }
      }
      return item;
    });

  const activeCategory = getActiveCategory(url, role);
  
  // Get subnav items filtered by sub-module permissions
  const rawSubNavItems = (role === 'admin' || role === 'manager') ? subNavs[activeCategory] : null;
  const subNavItems = rawSubNavItems ? rawSubNavItems.filter(item => 
    isSubNavAuthorized(item, activeCategory, userPermissions, role)
  ) : null;

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

          <div className="user-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Notification Bell — fully wired via NotificationPanel */}
            {(role === 'admin' || role === 'manager') && (
              <NotificationPanel unreadCount={unreadCount} />
            )}

            {/* Global Active Client Selector */}
            {(role === 'admin' || role === 'manager') && activeClients && activeClients.length > 0 && (
              <div className="active-client-selector" style={{ position: 'relative' }}>
                <select
                  value={activeClientId || 'all'}
                  onChange={(e) => {
                    const targetUrl = typeof route === 'function' && route().has('active-client.switch')
                      ? route('active-client.switch')
                      : '/active-client/switch';
                    router.post(targetUrl, { client_id: e.target.value }, { preserveState: true, preserveScroll: true });
                  }}
                  title="Global Active Client Selector"
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '6px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: '180px',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <option value="all" style={{ color: '#1E293B' }}>All Clients</option>
                  {activeClients.map(c => (
                    <option key={c.id} value={c.id} style={{ color: '#1E293B' }}>
                      {c.company_name} ({c.client_code})
                    </option>
                  ))}
                </select>
              </div>
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
                  <Link href={role === 'employee' ? (typeof route === 'function' && route().has('employee.profile') ? route('employee.profile') : '/employee/profile') : role === 'client' ? (typeof route === 'function' && route().has('client.profile') ? route('client.profile') : '/client/profile') : (typeof route === 'function' && route().has('account.profile') ? route('account.profile') : '/account/profile')} style={{ display: 'block', padding: '0.625rem 1rem', color: '#1e293b', textDecoration: 'none', borderBottom: '1px solid #f1f5f9', fontWeight: 500, fontSize: '0.85rem' }}>My Profile & Security</Link>
                  <Link href={typeof route === 'function' && route().has('account.sessions') ? route('account.sessions') : '/account/sessions'} style={{ display: 'block', padding: '0.625rem 1rem', color: '#1e293b', textDecoration: 'none', borderBottom: '1px solid #f1f5f9', fontWeight: 500, fontSize: '0.85rem' }}>Active Sessions</Link>
                  <Link href={typeof route === 'function' && route().has('logout') ? route('logout') : '/logout'} method="post" as="button" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.625rem 1rem', color: '#dc2626', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Sign Out</Link>
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
