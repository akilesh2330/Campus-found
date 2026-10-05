import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, BadgeCheck, Ban, Check, CircleAlert, FileCheck2, FileText, HeartHandshake, Package, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { api, getErrorMessage } from '../api';
import { useToast } from '../components/ToastContext';
import { EmptyState, ErrorPanel, PageHeading, PageLoader, StatusBadge } from '../components/Layout';

const chartColors = ['#6659E8', '#3982F6', '#33B59A', '#E5A649', '#F17988', '#8879F2', '#5B6A85'];

function AdminSidebar({ active }) {
  return <nav className="admin-tabs" aria-label="Administrator sections">{[
    { id: 'overview', to: '/admin', label: 'Overview', icon: Package },
    { id: 'items', to: '/admin/items', label: 'Manage reports', icon: FileText },
    { id: 'claims', to: '/admin/claims', label: 'Review claims', icon: HeartHandshake },
    { id: 'users', to: '/admin/users', label: 'Users', icon: Users },
  ].map(({ id, to, label, icon: Icon }) => <Link className={active === id ? 'admin-tab active' : 'admin-tab'} to={to} key={id}><Icon size={17} />{label}</Link>)}</nav>;
}

export function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); setError(''); api.get('/admin/dashboard').then(({ data: result }) => setData(result)).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  if (loading) return <div className="shell"><PageLoader label="Loading administrator dashboard" /></div>;
  if (error) return <section className="shell page-section"><ErrorPanel message={error} onRetry={load} /></section>;
  const stats = data?.stats || {};
  return <section className="admin-page page-section"><div className="shell"><div className="admin-heading"><div><span className="eyebrow">CAMPUS OPERATIONS</span><h1>Good afternoon, Admin.</h1><p>Here’s a clear look at what’s happening across your campus.</p></div><span className="admin-secure"><ShieldCheck size={16} /> Secure administrator view</span></div><AdminSidebar active="overview" />
    <div className="admin-metric-grid">{[
      { name: 'Registered users', value: stats.users, icon: Users, color: 'lavender', delta: 'Active accounts' },
      { name: 'Lost reports', value: stats.lost, icon: Search, color: 'blue', delta: 'Across campus' },
      { name: 'Found items', value: stats.found, icon: Package, color: 'green', delta: 'Waiting to reunite' },
      { name: 'Pending reports', value: stats.pendingReports, icon: FileCheck2, color: 'amber', delta: 'Need verification' },
      { name: 'Pending claims', value: stats.pendingClaims, icon: HeartHandshake, color: 'pink', delta: 'Need review' },
      { name: 'Items recovered', value: stats.recovered, icon: BadgeCheck, color: 'green', delta: 'Happy endings' },
      { name: 'Active listings', value: stats.active, icon: FileText, color: 'blue', delta: 'Currently discoverable' },
    ].map(({ name, value, icon: Icon, color, delta }) => <article className="admin-metric" key={name}><span className={`admin-metric-icon tint-${color}`}><Icon size={18} /></span><span className="admin-metric-label">{name}</span><strong>{(value || 0).toLocaleString()}</strong><small>{delta}</small></article>)}</div>
    <div className="admin-chart-grid"><section className="chart-panel"><div className="panel-heading"><div><span className="eyebrow">CAMPUS MOMENTUM</span><h2>Monthly reports & recoveries</h2></div><span className="chart-legend"><i className="legend-lost" /> Lost <i className="legend-found" /> Found <i className="legend-recovered" /> Recovered</span></div>{data?.monthly?.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={data.monthly} margin={{ top: 10, right: 6, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaebf1" /><XAxis dataKey="month" tickFormatter={(value) => value.slice(5)} axisLine={false} tickLine={false} tick={{ fill: '#8a8da0', fontSize: 12 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8a8da0', fontSize: 12 }} /><Tooltip contentStyle={{ border: '1px solid #eeeff4', borderRadius: 12, boxShadow: '0 8px 30px #20224812' }} /><Bar dataKey="lost" name="Lost" fill="#6B5EE8" radius={[5, 5, 0, 0]} /><Bar dataKey="found" name="Found" fill="#55A7F3" radius={[5, 5, 0, 0]} /><Bar dataKey="recovered" name="Recovered" fill="#33B59A" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState icon={FileText} title="Report trends will appear here" description="New report activity builds the monthly chart." />}</section>
      <section className="chart-panel"><div className="panel-heading"><div><span className="eyebrow">WHAT TURNS UP</span><h2>Items by category</h2></div></div>{data?.byCategory?.length ? <div className="category-chart"><ResponsiveContainer width="52%" height={220}><PieChart><Pie data={data.byCategory} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={3} stroke="none">{data.byCategory.map((row, index) => <Cell fill={chartColors[index % chartColors.length]} key={row.name} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="category-legend">{data.byCategory.slice(0, 6).map((row, index) => <span key={row.name}><i style={{ background: chartColors[index % chartColors.length] }} />{row.name}<strong>{row.value}</strong></span>)}</div></div> : <EmptyState icon={Package} title="No category data yet" description="Verified reports add to this breakdown." />}</section></div>
    <section className="admin-activity-panel"><div className="panel-heading"><div><span className="eyebrow">LIVE FROM THE COMMUNITY</span><h2>Recent activity</h2></div><Link to="/admin/items">Review reports <ArrowRight size={16} /></Link></div>{data?.recentActivity?.length ? <div className="activity-list">{data.recentActivity.map((activity, index) => <article className="activity-row" key={`${activity.kind}-${index}`}><span className={`activity-kind activity-${activity.kind}`}>{activity.kind === 'claim' ? <HeartHandshake size={16} /> : <FileText size={16} />}</span><div><strong>{activity.title}</strong><small>{activity.description}</small></div><StatusBadge status={activity.status} /><time>{new Date(activity.date).toLocaleDateString()}</time></article>)}</div> : <EmptyState icon={CircleAlert} title="No recent activity" description="Reports and claims will appear here as the community uses Campus Found." />}</section>
  </div></section>;
}

export function AdminItemsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0 });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => { setLoading(true); setError(''); api.get('/admin/items', { params: { q: query, status, type, page, limit: 10, sort: 'newest' } }).then(({ data }) => { setItems(data.items); setPagination(data.pagination); }).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [query, status, type, page]);
  const moderate = async (item, verificationStatus) => {
    const action = verificationStatus === 'verified' ? 'approve' : 'reject';
    if (verificationStatus === 'rejected' && !window.confirm(`Reject and close report ${item.reportId}?`)) return;
    try { await api.put(`/admin/items/${item._id}`, { verificationStatus, adminComment: '' }); toast(`Report ${action}d.`); load(); }
    catch (error) { toast(getErrorMessage(error), 'error'); }
  };
  const recover = async (item) => {
    if (!window.confirm(`Mark “${item.name}” as recovered? The report will be kept in recovery history.`)) return;
    try { await api.post(`/items/${item._id}/recover`); toast('Item marked as recovered.'); load(); }
    catch (error) { toast(getErrorMessage(error), 'error'); }
  };
  const remove = async (item) => {
    if (!window.confirm(`Remove “${item.name}” from active listings? Its report history will be retained.`)) return;
    try { await api.delete(`/admin/items/${item._id}`); toast('Report closed and removed from active listings.'); load(); }
    catch (error) { toast(getErrorMessage(error), 'error'); }
  };
  return <section className="admin-page page-section"><div className="shell"><PageHeading eyebrow="CAMPUS OPERATIONS" title="Manage reports" subtitle="Verify, search and moderate lost and found reports across campus." action={<span className="admin-secure"><ShieldCheck size={16} /> Admin only</span>} /><AdminSidebar active="items" />
    <section className="admin-table-panel"><div className="admin-filter-row"><div className="admin-search"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search name, report ID, location…" /></div><select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}><option value="">Lost & found</option><option>Lost</option><option>Found</option></select><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Any status</option>{['Active', 'Under Review', 'Matched', 'Claimed', 'Recovered', 'Closed'].map((entry) => <option key={entry}>{entry}</option>)}</select><span className="panel-count">{pagination.total || 0} reports</span></div>
      {error ? <ErrorPanel message={error} onRetry={load} /> : loading ? <PageLoader label="Loading reports" /> : items.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Item</th><th>Type / category</th><th>Reported by</th><th>Verification</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item._id}><td><div className="table-item"><img src={item.image || '/images/samples/lost-found-table.jpg'} alt="" onError={(event) => { event.currentTarget.src = '/images/samples/lost-found-table.jpg'; }} /><span><Link to={`/items/${item._id}`}>{item.name}</Link><small>{item.reportId} · {new Date(item.date).toLocaleDateString()}</small></span></div></td><td>{item.type}<small>{item.category}</small></td><td>{item.user?.name || 'Campus member'}</td><td><StatusBadge status={item.verificationStatus === 'verified' ? 'Verified' : item.verificationStatus === 'rejected' ? 'Rejected' : 'Pending'} /></td><td><StatusBadge status={item.status} /></td><td><div className="table-actions">{item.verificationStatus !== 'verified' && <button title="Approve report" className="action-approve" onClick={() => moderate(item, 'verified')}><Check size={15} /></button>}{item.verificationStatus !== 'rejected' && <button title="Reject report" className="action-reject" onClick={() => moderate(item, 'rejected')}><X size={15} /></button>}{!(['Recovered', 'Closed'].includes(item.status)) && <button title="Mark recovered" className="action-approve" onClick={() => recover(item)}><Check size={15} /></button>}<button title="Remove from active listings" className="action-remove" onClick={() => remove(item)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState icon={FileText} title="No reports found" description="Try changing the search or report filters." />}
      {pagination.pages > 1 && <div className="table-pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {pagination.pages}</span><button disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </section>
  </div></section>;
}

export function AdminClaimsPage() {
  const toast = useToast();
  const [claims, setClaims] = useState([]);
  const [status, setStatus] = useState('');
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => { setLoading(true); setError(''); api.get('/admin/claims', { params: status ? { status } : {} }).then(({ data }) => setClaims(data.claims)).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [status]);
  const update = async (claim, nextStatus) => {
    try { await api.put(`/admin/claims/${claim._id}`, { status: nextStatus, adminComment: comments[claim._id] || '' }); toast(nextStatus === 'Under Review' ? 'Request for more information sent.' : `Claim ${nextStatus.toLowerCase()}.`); load(); }
    catch (error) { toast(getErrorMessage(error), 'error'); }
  };
  const viewProof = async (claim) => {
    if (!claim.proof) return;
    try { const { data } = await api.get(claim.proof, { responseType: 'blob' }); const url = URL.createObjectURL(data); window.open(url, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(url), 60_000); }
    catch (error) { toast(getErrorMessage(error, 'This proof file is not available.'), 'error'); }
  };
  return <section className="admin-page page-section"><div className="shell"><PageHeading eyebrow="CAMPUS VERIFICATION" title="Review ownership claims" subtitle="Review private details and help verified owners reconnect with their belongings." action={<span className="admin-secure"><ShieldCheck size={16} /> Private review</span>} /><AdminSidebar active="claims" />
    <section className="admin-table-panel"><div className="admin-filter-row"><div><span className="eyebrow">CLAIM QUEUE</span><h2>{claims.length} claim{claims.length === 1 ? '' : 's'}</h2></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{['Pending', 'Under Review', 'Approved', 'Rejected'].map((entry) => <option key={entry}>{entry}</option>)}</select></div>
      {error ? <ErrorPanel message={error} onRetry={load} /> : loading ? <PageLoader label="Loading claims" /> : claims.length ? <div className="admin-claims-list">{claims.map((claim) => <article className="admin-claim-card" key={claim._id}><div className="admin-claim-top"><div className="claim-id-block"><span className="claim-icon"><HeartHandshake size={18} /></span><div><span className="eyebrow">{claim.claimId}</span><h2>{claim.item?.name || 'Found item'}</h2></div></div><StatusBadge status={claim.status} /></div><div className="admin-claim-meta"><span><strong>Claimant</strong>{claim.claimant?.name || 'Campus member'} · {claim.claimant?.email}</span><span><strong>Submitted</strong>{new Date(claim.createdAt).toLocaleString()}</span><span><strong>Report</strong>{claim.item?.reportId}</span></div><div className="claim-evidence"><div><span className="eyebrow">WHY THEY BELIEVE IT’S THEIRS</span><p>{claim.description}</p></div><div><span className="eyebrow">IDENTIFYING INFORMATION</span><p>{claim.identifyingInformation}</p></div>{claim.additionalDescription && <div><span className="eyebrow">ADDITIONAL DETAILS</span><p>{claim.additionalDescription}</p></div>}{claim.contactInformation && <div><span className="eyebrow">PRIVATE CONTACT</span><p>{claim.contactInformation}{claim.claimant?.phone ? ` · ${claim.claimant.phone}` : ''}</p></div>}</div><div className="claim-review-actions"><div className="claim-review-comment"><label htmlFor={`comment-${claim._id}`}>Note to claimant <span>(optional)</span></label><textarea id={`comment-${claim._id}`} rows="2" value={comments[claim._id] ?? claim.adminComment ?? ''} onChange={(event) => setComments((previous) => ({ ...previous, [claim._id]: event.target.value }))} disabled={['Approved', 'Rejected'].includes(claim.status)} placeholder="Share a helpful verification note…" /></div><div className="claim-review-buttons">{claim.proof && <button className="button button-secondary button-small" onClick={() => viewProof(claim)}><FileCheck2 size={16} /> View proof</button>}<button className="button button-secondary button-small" onClick={() => update(claim, 'Under Review')} disabled={['Approved', 'Rejected'].includes(claim.status)}><CircleAlert size={16} /> Request info</button><button className="button button-danger button-small" onClick={() => update(claim, 'Rejected')} disabled={['Approved', 'Rejected'].includes(claim.status)}><X size={16} /> Reject</button><button className="button button-primary button-small" onClick={() => update(claim, 'Approved')} disabled={['Approved', 'Rejected'].includes(claim.status)}><Check size={16} /> Approve claim</button></div></div></article>)}</div> : <EmptyState icon={HeartHandshake} title="No claims in this view" description="Ownership claims appear here after a campus member submits one." />}
    </section>
  </div></section>;
}

export function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => { setLoading(true); setError(''); api.get('/admin/users', { params: { q: query, active, limit: 50 } }).then(({ data }) => setUsers(data.users)).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [query, active]);
  const setUserActive = async (user, isActive) => {
    if (!isActive && !window.confirm(`Deactivate ${user.name}? They will be unable to sign in; their reports and claims are kept.`)) return;
    try { await api.patch(`/admin/users/${user._id}/status`, { isActive }); toast(isActive ? 'Account activated.' : 'Account deactivated.'); load(); }
    catch (error) { toast(getErrorMessage(error), 'error'); }
  };
  const deactivate = async (user) => {
    if (!window.confirm(`Deactivate ${user.name} and anonymize their sign-in email? This preserves linked reports and claims.`)) return;
    try { await api.delete(`/admin/users/${user._id}`); toast('User deactivated. Linked records were kept.'); load(); }
    catch (error) { toast(getErrorMessage(error), 'error'); }
  };
  return <section className="admin-page page-section"><div className="shell"><PageHeading eyebrow="CAMPUS COMMUNITY" title="Manage users" subtitle="Search accounts, activate or deactivate access, and preserve each user's report history." action={<span className="admin-secure"><ShieldCheck size={16} /> Admin only</span>} /><AdminSidebar active="users" />
    <section className="admin-table-panel"><div className="admin-filter-row"><div className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or department…" /></div><select value={active} onChange={(event) => setActive(event.target.value)}><option value="">All accounts</option><option value="true">Active</option><option value="false">Inactive</option></select><span className="panel-count">{users.length} users</span></div>
      {error ? <ErrorPanel message={error} onRetry={load} /> : loading ? <PageLoader label="Loading users" /> : users.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Campus member</th><th>Department</th><th>Role</th><th>Account status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user._id}><td><div className="table-user"><span className="avatar">{user.name?.slice(0, 1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td><td>{user.department}<small>{user.phone}</small></td><td><span className="role-chip">{user.role}</span></td><td><StatusBadge status={user.isActive ? 'Active' : 'Inactive'} /></td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td><div className="table-actions"><button className={user.isActive ? 'action-reject' : 'action-approve'} title={user.isActive ? 'Deactivate account' : 'Activate account'} onClick={() => setUserActive(user, !user.isActive)}>{user.isActive ? <Ban size={15} /> : <Check size={15} />}</button><button className="action-remove" title="Deactivate and anonymize account" onClick={() => deactivate(user)} disabled={!user.isActive}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState icon={Users} title="No users found" description="Try another name, email or account status." />}
    </section>
  </div></section>;
}
