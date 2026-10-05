import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Check, CircleAlert, Clock3, Edit3, FileText, HeartHandshake, History, MapPin, Package, Plus, Search, ShieldCheck, Trash2, Upload, UserRound, X } from 'lucide-react';
import { api, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/ToastContext';
import { EmptyState, ErrorPanel, PageHeading, PageLoader, ReportCard, StatusBadge, SubmitButton } from '../components/Layout';

const CATEGORIES = ['Electronics', 'Mobile Phones', 'Laptops', 'ID Cards', 'Wallets', 'Bags', 'Books', 'Accessories', 'Keys', 'Watches', 'Documents', 'Other'];

function DashboardNav({ active }) {
  const links = [
    { id: 'overview', to: '/dashboard', icon: Package, label: 'Overview' },
    { id: 'reports', to: '/dashboard/reports', icon: FileText, label: 'My reports' },
    { id: 'claims', to: '/dashboard/claims', icon: HeartHandshake, label: 'My claims' },
    { id: 'notifications', to: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
  ];
  return <nav className="dashboard-tabs" aria-label="Dashboard sections">{links.map(({ id, to, icon: Icon, label }) => <Link className={active === id ? 'dashboard-tab active' : 'dashboard-tab'} key={id} to={to}><Icon size={17} />{label}</Link>)}</nav>;
}

function EditReportDialog({ item, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const submit = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const body = new FormData(event.currentTarget);
      body.set('type', item.type);
      await api.put(`/items/${item._id}`, body);
      toast('Report updated and sent for verification.'); onSaved(); onClose();
    } catch (error) { toast(getErrorMessage(error), 'error'); }
    finally { setBusy(false); }
  };
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="edit-report-title"><div className="modal-header"><div><span className="eyebrow">REPORT DETAILS</span><h2 id="edit-report-title">Edit your report</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><form className="edit-form" onSubmit={submit}><label>Item name<input name="name" required minLength="2" maxLength="120" defaultValue={item.name} /></label><div className="form-row"><label>Category<select name="category" required defaultValue={item.category}>{CATEGORIES.map((entry) => <option key={entry}>{entry}</option>)}</select></label><label>Brand<input name="brand" defaultValue={item.brand} /></label></div><div className="form-row"><label>Color<input name="color" defaultValue={item.color} /></label><label>Location<input name="location" required defaultValue={item.location} /></label></div><div className="form-row"><label>Date<input name="date" type="date" required defaultValue={new Date(item.date).toISOString().slice(0, 10)} /></label><label>Time<input name="time" type="time" defaultValue={item.time} /></label></div><label>Description<textarea name="description" required minLength="10" maxLength="1800" rows="3" defaultValue={item.description} /></label><label>Identifying features<textarea name="identifyingFeatures" rows="2" defaultValue={item.identifyingFeatures} /></label><label className="upload-control"><Upload size={16} /><span><strong>Replace photo (optional)</strong><small>JPG, PNG, WEBP or GIF · up to 4 MB</small></span><input type="file" name="image" accept="image/*" /></label><div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><SubmitButton loading={busy}>Save report <Check size={16} /></SubmitButton></div></form></div></div>;
}

function ReportRow({ item, onEdit, onRefresh, onToast }) {
  const recover = async () => {
    if (!window.confirm(`Mark “${item.name}” as recovered? It will leave active listings but remain in your history.`)) return;
    try { await api.post(`/items/${item._id}/recover`); onToast('Item marked as recovered.'); onRefresh(); }
    catch (error) { onToast(getErrorMessage(error), 'error'); }
  };
  const close = async () => {
    if (!window.confirm(`Close report ${item.reportId}? This action removes it from active campus listings.`)) return;
    try { await api.delete(`/items/${item._id}`); onToast('Report closed.'); onRefresh(); }
    catch (error) { onToast(getErrorMessage(error), 'error'); }
  };
  return <article className="report-row"><div className="report-row-image"><img src={item.image || '/images/samples/lost-found-table.jpg'} alt="" onError={(event) => { event.currentTarget.src = '/images/samples/lost-found-table.jpg'; }} /></div><div className="report-row-main"><div className="report-row-top"><Link to={`/items/${item._id}`}><strong>{item.name}</strong></Link><StatusBadge status={item.status} /></div><span>{item.type} · {item.category} · {item.reportId}</span><small><MapPin size={13} /> {item.location} · {new Date(item.date).toLocaleDateString()}</small></div><div className="report-row-actions"><button title="Edit report" aria-label={`Edit ${item.name}`} onClick={() => onEdit(item)} disabled={['Claimed', 'Recovered', 'Closed'].includes(item.status)}><Edit3 size={16} /></button>{item.status !== 'Recovered' && item.status !== 'Closed' && <button title="Mark recovered" aria-label={`Mark ${item.name} recovered`} onClick={recover}><Check size={17} /></button>}<button className="danger-icon" title="Close report" aria-label={`Close ${item.name}`} onClick={close} disabled={['Recovered', 'Closed', 'Claimed'].includes(item.status)}><Trash2 size={16} /></button></div></article>;
}

function NotificationFeed({ items, unread, onRead, onReadAll }) {
  if (!items?.length) return <EmptyState icon={Bell} title="You’re all caught up" description="Updates about your reports, claims and possible matches will appear here." />;
  return <div className="notification-feed"><div className="notification-feed-head"><span>{unread} unread notification{unread === 1 ? '' : 's'}</span>{unread > 0 && <button className="text-button" onClick={onReadAll}>Mark all as read</button>}</div>{items.map((notification) => <article className={`notification-card ${notification.isRead ? '' : 'notification-unread'}`} key={notification._id}><span className={`notification-type type-${notification.type}`}><Bell size={17} /></span><div><strong>{notification.title}</strong><p>{notification.message}</p><small>{new Date(notification.createdAt).toLocaleString()}</small></div>{!notification.isRead && <button className="mark-read" onClick={() => onRead(notification._id)} aria-label="Mark notification as read"><Check size={16} /></button>}</article>)}</div>;
}

export function UserDashboardPage({ section }) {
  const active = section || 'overview';
  const { refreshNotifications } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [recoveries, setRecoveries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const load = async () => {
    setBusy(true); setError('');
    try {
      const [dashboard, recoveryData] = await Promise.all([api.get('/dashboard'), api.get('/recoveries')]);
      setData(dashboard.data); setRecoveries(recoveryData.data.recoveries || []);
      if (active === 'notifications') {
        const response = await api.get('/notifications'); setNotifications(response.data);
      }
    } catch (err) { setError(getErrorMessage(err, 'Your dashboard could not be loaded.')); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(); }, [active]);
  const setErrorToast = (message, type = 'success') => toast(message, type);
  const markOne = async (id) => { await api.patch(`/notifications/${id}/read`); await refreshNotifications(); load(); };
  const markAll = async () => { await api.patch('/notifications/read-all'); await refreshNotifications(); load(); };
  if (busy && !data) return <div className="shell"><PageLoader label="Loading your campus dashboard" /></div>;
  if (error && !data) return <section className="shell page-section"><ErrorPanel message={error} onRetry={load} /></section>;
  const cards = data?.cards || {};
  const heading = active === 'reports' ? ['YOUR CAMPUS ACTIVITY', 'My reports', 'Track, update or close your lost and found reports.'] : active === 'claims' ? ['OWNERSHIP CLAIMS', 'My claims', 'Follow the status of every ownership claim you have submitted.'] : active === 'notifications' ? ['CAMPUS UPDATES', 'Notifications', 'A clear record of what is happening with your reports and claims.'] : ['WELCOME BACK', 'Your campus, at a glance', 'Your items, ownership claims and possible matches — all together.'];
  return <section className="dashboard-page page-section"><div className="shell"><div className="dashboard-welcome"><div><span className="eyebrow">{heading[0]}</span><h1>{heading[1]}</h1><p>{heading[2]}</p></div>{active !== 'notifications' && <div className="dashboard-quick-actions"><Link className="button button-primary button-small" to="/report/lost"><Plus size={16} /> Report lost</Link><Link className="button button-secondary button-small" to="/report/found"><Plus size={16} /> Report found</Link></div>}</div>
      <DashboardNav active={active} />
      {active === 'overview' && <>
        <div className="metric-grid"><Metric icon={Search} number={cards.myLost || 0} label="My lost reports" tint="lavender" /><Metric icon={Package} number={cards.myFound || 0} label="My found reports" tint="blue" /><Metric icon={Clock3} number={cards.activeClaims || 0} label="Active claims" tint="amber" /><Metric icon={HeartHandshake} number={cards.approvedClaims || 0} label="Approved claims" tint="blue" /><Metric icon={HeartHandshake} number={cards.recovered || 0} label="Items recovered" tint="green" /></div>
        <div className="dashboard-columns"><section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">LATEST ACTIVITY</span><h2>My recent reports</h2></div><Link to="/dashboard/reports">All reports <ArrowRight size={16} /></Link></div>{data?.reports?.length ? data.reports.slice(0, 4).map((item) => <ReportRow key={item._id} item={item} onEdit={setEditing} onRefresh={load} onToast={setErrorToast} />) : <EmptyState icon={FileText} title="Your first report starts here" description="Let your campus know what you’ve lost or found." action={<Link className="button button-primary button-small" to="/report/lost">Create a report</Link>} />}</section>
          <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">STAY IN THE LOOP</span><h2>Recent updates</h2></div><Link to="/dashboard/notifications">All updates <ArrowRight size={16} /></Link></div>{data?.notifications?.length ? <div className="mini-notifications">{data.notifications.slice(0, 4).map((note) => <div className="mini-notification" key={note._id}><span className={note.isRead ? '' : 'mini-unread-dot'} /><div><strong>{note.title}</strong><small>{note.message}</small><time>{new Date(note.createdAt).toLocaleDateString()}</time></div></div>)}</div> : <EmptyState icon={Bell} title="No updates yet" description="We’ll let you know when there’s news about your reports." />}</section></div>
        <div className="dashboard-panel dashboard-wide"><div className="panel-heading"><div><span className="eyebrow">WORTH A LOOK</span><h2>Possible matches</h2></div><span className="match-explain"><Sparkles size={15} /> Clear factors, no black box</span></div>{data?.matches?.length ? <div className="match-grid">{data.matches.slice(0, 3).map((match, index) => <Link className="match-card" to={`/items/${match.item._id}`} key={`${match.item._id}-${index}`}><div className="match-card-photo"><img src={match.item.image || '/images/samples/lost-found-table.jpg'} alt="" /><span>{match.score}% match</span></div><div><small>For report {match.lostReportId}</small><strong>{match.item.name}</strong><span>{match.factors.slice(0, 3).map((factor) => factor.label).join(' · ') || 'Date and description'}</span></div><ArrowRight size={16} /></Link>)}</div> : <div className="match-empty"><span className="match-empty-icon"><Sparkles size={19} /></span><div><strong>No possible matches just yet</strong><p>When a verified found report looks like one of your lost reports, it will show up here.</p></div><Link className="text-link" to="/lost">Review reports <ArrowRight size={16} /></Link></div>}</div>
        {recoveries.length > 0 && <section className="dashboard-panel dashboard-wide"><div className="panel-heading"><div><span className="eyebrow">A HAPPY ENDING</span><h2>Recovery history</h2></div><History size={18} /></div><div className="recovery-strip">{recoveries.slice(0, 3).map((record) => <div key={record._id}><span className="recovery-check"><Check size={15} /></span><div><strong>{record.item?.name || 'Recovered item'}</strong><small>{new Date(record.recoveredDate).toLocaleDateString()} · {record.item?.reportId}</small></div></div>)}</div></section>}
      </>}
      {active === 'reports' && <section className="dashboard-panel dashboard-wide"><div className="panel-heading"><div><span className="eyebrow">MY SUBMISSIONS</span><h2>All reports</h2></div><span className="panel-count">{data?.reports?.length || 0} recent</span></div>{data?.reports?.length ? <div className="report-list">{data.reports.map((item) => <ReportRow key={item._id} item={item} onEdit={setEditing} onRefresh={load} onToast={setErrorToast} />)}</div> : <EmptyState icon={FileText} title="No reports yet" description="Reports you submit will appear here with verification and recovery status." action={<Link className="button button-primary" to="/report/lost">Report an item</Link>} />}</section>}
      {active === 'claims' && <section className="dashboard-panel dashboard-wide"><div className="panel-heading"><div><span className="eyebrow">OWNERSHIP CHECKS</span><h2>Claim history</h2></div></div>{data?.claims?.length ? <div className="claims-list">{data.claims.map((claim) => <article className="claim-row" key={claim._id}><span className="claim-icon"><HeartHandshake size={18} /></span><div className="claim-row-main"><div><strong>{claim.item?.name || 'Campus item'}</strong><StatusBadge status={claim.status} /></div><span>{claim.claimId} · Submitted {new Date(claim.createdAt).toLocaleDateString()}</span><p>{claim.description}</p>{claim.adminComment && <small className="admin-comment"><CircleAlert size={14} /> Campus staff: {claim.adminComment}</small>}</div>{claim.status === 'Approved' && claim.item && <button className="button button-secondary button-small" onClick={async () => { if (!window.confirm(`Mark “${claim.item.name}” as recovered?`)) return; try { await api.post(`/items/${claim.item._id}/recover`, { claimId: claim._id }); toast('Item marked as recovered.'); load(); } catch (error) { toast(getErrorMessage(error), 'error'); } }}><Check size={14} /> Mark recovered</button>}<Link className="text-link" to={claim.item ? `/items/${claim.item._id}` : '/dashboard'}>View <ArrowRight size={15} /></Link></article>)}</div> : <EmptyState icon={HeartHandshake} title="No ownership claims yet" description="If you recognise a verified found item, submit a private claim and follow its status here." action={<Link className="button button-secondary" to="/found">Browse found items</Link>} />}</section>}
      {active === 'notifications' && <section className="dashboard-panel dashboard-wide"><div className="panel-heading"><div><span className="eyebrow">YOUR UPDATES</span><h2>Notifications</h2></div><span className="panel-count">{notifications?.unread || 0} unread</span></div>{notifications ? <NotificationFeed items={notifications.notifications} unread={notifications.unread} onRead={markOne} onReadAll={markAll} /> : <PageLoader />}</section>}
      {error && data && <div className="inline-error">{error}</div>}
      {editing && <EditReportDialog item={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div></section>;
}

function Metric({ icon: Icon, number, label, tint }) { return <article className="metric-card"><span className={`metric-icon tint-${tint}`}><Icon size={20} /></span><div><strong>{number}</strong><span>{label}</span></div><span className="metric-mark" /></article>; }

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = new FormData(event.currentTarget);
      const { data } = await api.put('/auth/profile', body);
      updateUser(data.user); toast('Your profile has been updated.');
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };
  return <section className="profile-page page-section"><div className="shell profile-shell"><div className="breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/dashboard">Dashboard</Link><span>/</span><span>Profile</span></div><PageHeading eyebrow="YOUR ACCOUNT" title="Profile & settings" subtitle="Keep your campus contact and department information up to date." /><div className="profile-layout"><aside className="profile-card"><span className="profile-avatar">{user?.profileImage ? <img src={user.profileImage} alt="" /> : user?.name?.slice(0, 1).toUpperCase()}<i><UserRound size={14} /></i></span><h2>{user?.name}</h2><p>{user?.department}</p><span className="profile-role"><ShieldCheck size={14} /> {user?.role === 'admin' ? 'Campus administrator' : 'Campus member'}</span><div className="profile-meta"><span>Account created</span><strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'Recently'}</strong></div></aside><form className="profile-form card-panel" onSubmit={submit}><div className="form-section-heading"><span className="eyebrow">PERSONAL INFORMATION</span><h2>About you</h2><p>Your email is used for sign-in. Contact information is never shared on public item listings.</p></div>{error && <div className="form-error"><span>!</span>{error}</div>}<label>Full name<input name="name" required minLength="2" maxLength="90" defaultValue={user?.name} /></label><label>Email address<input value={user?.email || ''} disabled /><small className="field-hint">Email changes are managed by campus support.</small></label><div className="form-row"><label>Phone number<input name="phone" required minLength="7" maxLength="30" defaultValue={user?.phone} /></label><label>Department<input name="department" required minLength="2" maxLength="100" defaultValue={user?.department} /></label></div><label className="upload-control"><Upload size={17} /><span><strong>Profile photo</strong><small>Optional · JPG, PNG, WEBP or GIF · up to 4 MB</small></span><input type="file" name="profileImage" accept="image/*" /></label><SubmitButton loading={busy}>Save profile <Check size={16} /></SubmitButton></form></div></div></section>;
}
