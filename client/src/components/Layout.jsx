import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, CircleHelp, Compass, LogOut, Menu, Plus, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const primaryLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/lost', label: 'Lost items' },
  { to: '/found', label: 'Found items' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/about', label: 'About' },
];

export function Header() {
  const { user, unread, refreshNotifications, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  useEffect(() => { if (user) refreshNotifications(); }, [user]);
  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/search${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
    setOpen(false);
  };
  const signOut = async () => { await logout(); setProfileOpen(false); navigate('/'); };
  return (
    <header className="site-header">
      <div className="topline"><span><ShieldCheck size={14} /> A safer way to reunite campus belongings</span><Link to="/how-it-works">How it works <span aria-hidden="true">↗</span></Link></div>
      <div className="header-main shell">
        <Link className="brand" to="/" aria-label="Campus Found home">
          <img src="/images/brand/brandmark.svg" alt="" />
          <span><strong>campus<span>found</span></strong><small>LOST & FOUND, REUNITED</small></span>
        </Link>
        <nav className={`main-nav ${open ? 'nav-open' : ''}`} aria-label="Main navigation">
          {primaryLinks.map((link) => <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setOpen(false)}>{link.label}</NavLink>)}
          <form className="header-search" onSubmit={submitSearch} role="search"><Search size={16} /><input aria-label="Search items" placeholder="Search items" value={query} onChange={(event) => setQuery(event.target.value)} /><button aria-label="Submit search"><span className="sr-only">Search</span>⌕</button></form>
          {user && <div className="mobile-auth-links"><Link to="/dashboard" onClick={() => setOpen(false)}>My dashboard</Link><Link to="/dashboard/notifications" onClick={() => setOpen(false)}>Notifications {unread > 0 && <b className="count-badge">{unread}</b>}</Link></div>}
          {!user && <div className="mobile-auth-links"><Link to="/login">Log in</Link><Link to="/register">Create account</Link></div>}
        </nav>
        <div className="header-actions">
          <Link className="icon-link notification-link" to={user ? '/dashboard/notifications' : '/login'} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}><Bell size={19} />{unread > 0 && <span className="count-badge">{unread > 9 ? '9+' : unread}</span>}</Link>
          {user ? <div className="profile-menu-wrap">
            <button className="profile-menu-trigger" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen}>
              <span className="avatar">{user.name?.slice(0, 1).toUpperCase()}</span><span className="profile-trigger-copy"><strong>{user.name?.split(' ')[0]}</strong><small>{user.role === 'admin' ? 'Administrator' : 'Student'}</small></span><ChevronDown size={15} />
            </button>
            {profileOpen && <div className="profile-menu">
              <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} onClick={() => setProfileOpen(false)}><Compass size={16} /> Dashboard</Link>
              <Link to="/profile" onClick={() => setProfileOpen(false)}><UserRound size={16} /> My profile</Link>
              {user.role === 'admin' && <Link to="/admin/claims" onClick={() => setProfileOpen(false)}><ShieldCheck size={16} /> Review claims</Link>}
              <button onClick={signOut}><LogOut size={16} /> Sign out</button>
            </div>}
          </div> : <div className="guest-actions"><Link className="login-link" to="/login">Log in</Link><Link className="button button-primary button-small" to="/register">Get started</Link></div>}
          <button className="mobile-menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((value) => !value)}>{open ? <X size={23} /> : <Menu size={23} />}</button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return <footer className="site-footer">
    <div className="shell footer-grid">
      <div className="footer-brand"><Link className="brand brand-light" to="/"><img src="/images/brand/brandmark.svg" alt="" /><span><strong>campus<span>found</span></strong><small>LOST & FOUND, REUNITED</small></span></Link><p>Good things find their way back. A trusted place to report, discover and reunite belongings across campus.</p></div>
      <div><h3>Explore</h3><Link to="/lost">Lost items</Link><Link to="/found">Found items</Link><Link to="/search">Search everything</Link></div>
      <div><h3>Campus Found</h3><Link to="/how-it-works">How it works</Link><Link to="/about">About the platform</Link><Link to="/register">Join your campus</Link></div>
      <div className="footer-note"><span className="footer-icon"><CircleHelp size={19} /></span><h3>Need a hand?</h3><p>For help with a report or claim, contact your campus student services team.</p><span className="footer-status"><i /> Campus community service</span></div>
    </div>
    <div className="shell footer-bottom"><span>© {new Date().getFullYear()} Campus Found</span><span>Built for a more connected campus <span className="footer-heart">♥</span></span><Link to="/about">Privacy-first by design</Link></div>
  </footer>;
}

export function AppShell({ children }) { return <><Header /><main>{children}</main><Footer /></>; }

export function RequireAuth({ children, role }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoader label="Checking your session" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export function PageLoader({ label = 'Loading' }) { return <div className="page-loader"><span className="spinner" /><p>{label}…</p></div>; }

export function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

export function EmptyState({ icon: Icon = Search, title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={24} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function ErrorPanel({ message, onRetry }) {
  return <div className="error-panel"><strong>We couldn’t load this right now.</strong><p>{message}</p>{onRetry && <button className="button button-secondary button-small" onClick={onRetry}>Try again</button>}</div>;
}

export function StatusBadge({ status }) {
  const value = String(status || 'Active');
  const modifier = value.toLowerCase().replace(/\s+/g, '-');
  return <span className={`status-badge status-${modifier}`}><i />{value}</span>;
}

export function ReportCard({ item }) {
  const image = item.image || '/images/samples/lost-found-table.jpg';
  return <article className="item-card">
    <Link to={`/items/${item._id}`} className="item-image-wrap" aria-label={`View ${item.name}`}>
      <img className="item-image" src={image} alt={item.name} loading="lazy" onError={(event) => { event.currentTarget.src = '/images/samples/lost-found-table.jpg'; }} />
      <span className={`type-pill type-${item.type?.toLowerCase()}`}>{item.type === 'Lost' ? 'Lost item' : 'Found item'}</span>
      <span className="save-item" aria-hidden="true"><Plus size={15} /></span>
    </Link>
    <div className="item-card-body">
      <div className="item-card-meta"><span>{item.category}</span><span>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
      <Link to={`/items/${item._id}`} className="item-card-title">{item.name}</Link>
      <p>{item.description}</p>
      <div className="item-card-footer"><span className="location-text"><Compass size={14} />{item.location}</span><StatusBadge status={item.status} /></div>
    </div>
  </article>;
}

export function SubmitButton({ loading, children, className = '' }) {
  return <button className={`button button-primary ${className}`} type="submit" disabled={loading}>{loading ? <><span className="button-spinner" /> Please wait…</> : children}</button>;
}
