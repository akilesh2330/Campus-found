import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Compass, HeartHandshake, KeyRound, Laptop, MapPin, Package, Plus, Search, ShieldCheck, Sparkles, Tag, Upload, WalletCards } from 'lucide-react';
import { api, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/ToastContext';
import { EmptyState, ErrorPanel, PageHeading, PageLoader, ReportCard, StatusBadge, SubmitButton } from '../components/Layout';

const CATEGORIES = ['Electronics', 'Mobile Phones', 'Laptops', 'ID Cards', 'Wallets', 'Bags', 'Books', 'Accessories', 'Keys', 'Watches', 'Documents', 'Other'];
const today = new Date().toISOString().slice(0, 10);

export function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ lost: 0, found: 0, recovered: 0, users: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  useEffect(() => {
    Promise.all([api.get('/stats/public'), api.get('/items', { params: { limit: 3, sort: 'newest' } })])
      .then(([statResponse, itemResponse]) => { setStats(statResponse.data); setRecent(itemResponse.data.items || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const steps = [
    { number: '01', icon: Plus, title: 'Report', copy: 'Share a few details about what went missing or what you found.' },
    { number: '02', icon: Search, title: 'Search', copy: 'Explore verified reports using campus locations and categories.' },
    { number: '03', icon: HeartHandshake, title: 'Claim', copy: 'Share the details only the true owner would know.' },
    { number: '04', icon: ShieldCheck, title: 'Verify', copy: 'Campus staff review each report and ownership claim.' },
    { number: '05', icon: Check, title: 'Recover', copy: 'Coordinate a safe hand-off and close the loop.' },
  ];
  return <>
    <section className="hero-section">
      <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
      <div className="shell hero-grid">
        <div className="hero-copy">
          <span className="hero-kicker"><span className="kicker-dot" /> CAMPUS COMMUNITY, CONNECTED</span>
          <h1>Lost something?<br /><em>Found something?</em><br />Let’s reunite it.</h1>
          <p className="hero-lede">The thoughtful way to bring campus belongings back to the people who miss them. Report, browse and reconnect — all in one trusted place.</p>
          <form className="hero-search" onSubmit={(event) => { event.preventDefault(); navigate(`/search?q=${encodeURIComponent(query)}`); }}>
            <Search size={20} /><input aria-label="Search for a missing item" placeholder="Try ‘blue water bottle’ or ‘library’" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="submit">Search <ArrowRight size={16} /></button>
          </form>
          <div className="hero-ctas"><Link className="button button-primary" to="/report/lost">Report a lost item <ArrowUpRight size={17} /></Link><Link className="button button-white" to="/report/found">I found something <ArrowUpRight size={17} /></Link><Link className="button button-white" to="/search">Browse items <ArrowRight size={16} /></Link></div>
          <div className="hero-trust"><div className="avatar-stack"><span>A</span><span>M</span><span>R</span><span>+</span></div><p><strong>A little less lost.</strong><br />A campus that looks out for each other.</p></div>
        </div>
        <div className="hero-visual">
          <div className="hero-visual-backdrop" />
          <div className="hero-photo-card"><img src="/images/samples/lost-found-table.jpg" alt="A campus lost-and-found table with belongings waiting to be reunited" /><div className="photo-label"><span><Compass size={15} /> CENTRAL LIBRARY</span><strong>Found, safe & sound.</strong></div></div>
          <div className="floating-note note-top"><span className="floating-icon floating-icon-purple"><HeartHandshake size={17} /></span><span><strong>One good match</strong><small>can make someone’s day</small></span><span className="note-spark">✦</span></div>
          <div className="floating-note note-bottom"><span className="verified-mark"><Check size={16} /></span><span><strong>Campus verified</strong><small>Every report, thoughtfully reviewed</small></span></div>
          <div className="hero-graphic-tag tag-one"><KeyRound size={19} /><span>keys</span></div><div className="hero-graphic-tag tag-two"><WalletCards size={19} /><span>wallet</span></div>
          <div className="hero-visual-caption"><span className="caption-line" /> Little things find their way back.</div>
        </div>
      </div>
      <div className="hero-bottom shell"><span>MADE FOR YOUR CAMPUS</span><div><span><ShieldCheck size={15} /> Verified reports</span><span><KeyRound size={15} /> Private claims</span><span><HeartHandshake size={15} /> Human hand-offs</span></div></div>
    </section>

    <section className="stats-band shell" aria-label="Campus Found statistics">
      <div className="stats-intro"><span className="eyebrow">GOOD THINGS ADD UP</span><p>Every report brings the community<br />one step closer.</p></div>
      {[{ value: stats.lost, label: 'Lost reports', icon: Search }, { value: stats.found, label: 'Found items', icon: Package }, { value: stats.recovered, label: 'Items reunited', icon: HeartHandshake }, { value: stats.users, label: 'Campus members', icon: ShieldCheck }].map(({ value, label, icon: Icon }) => <div className="stat-block" key={label}><span className="stat-icon"><Icon size={18} /></span><strong>{value.toLocaleString()}</strong><span>{label}</span></div>)}
    </section>

    <section className="section-section section-soft">
      <div className="shell">
        <div className="section-header"><div><span className="eyebrow">A GOOD PLACE TO START</span><h2>Find what you’re<br className="desktop-only" /> looking for.</h2><p>Start with the latest verified reports from across campus.</p></div><Link className="text-link" to="/search">Browse all items <ArrowRight size={17} /></Link></div>
        {loading ? <div className="inline-loader"><span className="spinner" /> Finding recent reports…</div> : recent.length ? <div className="item-grid">{recent.map((item) => <ReportCard key={item._id} item={item} />)}</div> : <div className="home-empty"><Package size={22} /><span>New reports will appear here as soon as they’re verified.</span></div>}
      </div>
    </section>

    <section className="section-section how-home" id="how-it-works">
      <div className="shell">
        <div className="center-heading"><span className="eyebrow">SIMPLE BY DESIGN</span><h2>Five small steps.<br /><em>One happy reunion.</em></h2><p>From the first report to the final hand-off, we make the important parts clear.</p></div>
        <div className="steps-grid">{steps.map(({ number, icon: Icon, title, copy }, index) => <div className="step-card" key={title}><div className="step-top"><span>{number}</span><Icon size={20} /></div><h3>{title}</h3><p>{copy}</p>{index < steps.length - 1 && <span className="step-arrow"><ArrowRight size={18} /></span>}</div>)}</div>
        <div className="step-cta"><span>Ready to make the first move?</span><Link className="button button-primary" to="/report/lost">Start a report <ArrowRight size={17} /></Link></div>
      </div>
    </section>

    <section className="callout-section shell"><div className="callout-panel"><div className="callout-mark"><HeartHandshake size={25} /></div><div><span className="eyebrow">THE LITTLE THINGS MATTER</span><h2>Found something on campus?</h2><p>It might be the one thing someone’s been looking for all day.</p></div><Link className="button button-white" to="/report/found">Report a found item <ArrowUpRight size={17} /></Link><span className="callout-decor decor-one" /><span className="callout-decor decor-two" /></div></section>
  </>;
}

export function ListingsPage({ type }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({ q: searchParams.get('q') || '', type: searchParams.get('type') || '', category: searchParams.get('category') || '', location: '', dateFrom: '', dateTo: '', status: '', sort: 'newest' });
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => { setFilters((previous) => ({ ...previous, q: searchParams.get('q') || '', type: searchParams.get('type') || '' })); }, [searchParams]);
  const params = useMemo(() => ({ ...filters, type: type || filters.type || '', page, limit: 9 }), [filters, type, page]);
  const load = () => {
    setLoading(true); setError('');
    api.get('/items', { params })
      .then(({ data }) => { setItems(data.items || []); setPagination(data.pagination || { page: 1, pages: 0, total: 0 }); })
      .catch((err) => setError(getErrorMessage(err, 'Items could not be loaded.')))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [params]);
  const update = (name, value) => { setPage(1); setFilters((previous) => ({ ...previous, [name]: value })); };
  const heading = type === 'Lost' ? 'Lost items' : type === 'Found' ? 'Found items' : 'Search campus reports';
  const submit = (event) => { event.preventDefault(); setSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(filters.type ? { type: filters.type } : {}) }); setPage(1); };
  return <section className="listing-page page-section">
    <div className="shell">
      <div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>{heading}</span></div>
      <PageHeading eyebrow={type ? `${type.toUpperCase()} REPORTS` : 'CAMPUS SEARCH'} title={heading} subtitle={type === 'Lost' ? 'Browse the latest verified reports from students and staff across campus.' : type === 'Found' ? 'Help a campus belonging find its way back home.' : 'Search verified lost and found items across your campus.'} action={<Link className="button button-primary" to={type === 'Found' ? '/report/found' : '/report/lost'}><Plus size={17} /> Report an item</Link>} />
      <form className="filter-panel" onSubmit={submit}>
        <div className="filter-top-row"><div className="filter-search"><Search size={19} /><input value={filters.q} onChange={(event) => update('q', event.target.value)} placeholder="Search name, brand, color or keyword" aria-label="Search by keyword" /><button className="button button-primary button-small" type="submit">Search</button></div><button type="button" className={`filter-toggle ${advanced ? 'is-active' : ''}`} onClick={() => setAdvanced((value) => !value)}><span className="filter-tune">☷</span> Filters {advanced && <span className="filter-live">ON</span>}</button></div>
        <div className={`filter-fields ${advanced ? 'filters-expanded' : ''}`}>
          {!type && <label>Report type<select value={filters.type || ''} onChange={(event) => { setSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(event.target.value ? { type: event.target.value } : {}) }); update('type', event.target.value); }}><option value="">Lost & found</option><option value="Lost">Lost only</option><option value="Found">Found only</option></select></label>}
          <label>Category<select value={filters.category} onChange={(event) => update('category', event.target.value)}><option value="">All categories</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Location<input value={filters.location} onChange={(event) => update('location', event.target.value)} placeholder="e.g. Central Library" /></label>
          <label>Sort by<select value={filters.sort} onChange={(event) => update('sort', event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="updated">Recently updated</option></select></label>
          {advanced && <>
            <label>Date from<input type="date" value={filters.dateFrom} onChange={(event) => update('dateFrom', event.target.value)} /></label>
            <label>Date to<input type="date" value={filters.dateTo} onChange={(event) => update('dateTo', event.target.value)} /></label>
            <label>Status<select value={filters.status} onChange={(event) => update('status', event.target.value)}><option value="">Any active status</option>{['Active', 'Under Review', 'Matched', 'Claimed'].map((status) => <option key={status}>{status}</option>)}</select></label>
          </>}
        </div>
      </form>
      <div className="result-bar"><p>{loading ? 'Searching reports…' : <><strong>{pagination.total}</strong> verified report{pagination.total === 1 ? '' : 's'}{filters.q && <> for <strong>“{filters.q}”</strong></>}</>}</p><span><ShieldCheck size={15} /> Verified by campus staff</span></div>
      {error ? <ErrorPanel message={error} onRetry={load} /> : loading ? <div className="listing-loader"><PageLoader label="Finding items" /></div> : items.length === 0 ? <EmptyState icon={Package} title="No reports match that search" description="Try a nearby category or location, or clear a filter to see more campus reports." action={<button className="button button-secondary" onClick={() => { setFilters({ q: '', category: '', location: '', dateFrom: '', dateTo: '', status: '', sort: 'newest' }); setPage(1); }}>Clear filters</button>} /> : <div className="item-grid item-grid-listing">{items.map((item) => <ReportCard key={item._id} item={item} />)}</div>}
      {pagination.pages > 1 && <div className="pagination"><button className="pagination-arrow" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button><span>Page <strong>{page}</strong> of {pagination.pages}</span><button className="pagination-arrow" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><ChevronRight size={18} /></button></div>}
    </div>
  </section>;
}

export function ItemDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const possibleMatches = location.state?.matches || [];
  const { user, refreshNotifications } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();
  const load = () => { setLoading(true); api.get(`/items/${id}`).then(({ data }) => setItem(data.item)).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [id]);
  const submitClaim = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const form = new FormData(event.currentTarget);
      const { data } = await api.post(`/claims/${item._id}`, form);
      setSubmitted(true); setClaiming(false); toast(`Claim ${data.claim.claimId} submitted for review.`); await refreshNotifications();
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally { setSubmitting(false); }
  };
  if (loading) return <div className="shell"><PageLoader label="Loading item details" /></div>;
  if (error || !item) return <section className="shell page-section"><ErrorPanel message={error || 'This item report is not available.'} onRetry={load} /></section>;
  const image = item.image || '/images/samples/lost-found-table.jpg';
  return <section className="details-page page-section"><div className="shell">
    <div className="breadcrumb"><Link to="/">Home</Link><span>/</span><Link to={item.type === 'Lost' ? '/lost' : '/found'}>{item.type} items</Link><span>/</span><span>Item details</span></div>
    <div className="details-grid">
      <div className="details-image-column"><div className="details-image"><img src={image} alt={item.name} onError={(event) => { event.currentTarget.src = '/images/samples/lost-found-table.jpg'; }} /><span className={`type-pill type-${item.type.toLowerCase()}`}>{item.type} item</span><span className="detail-verified"><BadgeCheck size={15} /> Campus verified</span></div><div className="privacy-note"><ShieldCheck size={18} /><span><strong>Personal details stay private.</strong><br />We only share contact information after staff approve an ownership claim.</span></div></div>
      <div className="details-copy"><div className="detail-topline"><span className="eyebrow">{item.category.toUpperCase()} · {item.reportId}</span><StatusBadge status={item.status} /></div><h1>{item.name}</h1><p className="details-description">{item.description}</p>
        <div className="item-facts"><div><MapPin size={17} /><span><small>Last seen at</small><strong>{item.location}</strong></span></div><div><CalendarDays size={17} /><span><small>{item.type === 'Lost' ? 'Date lost' : 'Date found'}</small><strong>{new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</strong></span></div>{item.time && <div><Clock3 size={17} /><span><small>Approximate time</small><strong>{item.time}</strong></span></div>}{item.brand && <div><Tag size={17} /><span><small>Brand</small><strong>{item.brand}</strong></span></div>}{item.color && <div><span className="color-dot" /><span><small>Color</small><strong>{item.color}</strong></span></div>}</div>
        {item.identifyingFeatures && <div className="identifying-note"><span className="eyebrow">IDENTIFYING FEATURES</span><p>{item.identifyingFeatures}</p></div>}
        <div className="reporter-note"><span className="avatar avatar-soft">{item.user?.name?.slice(0, 1) || 'C'}</span><p>Reported by <strong>{item.user?.name || 'Campus member'}</strong><small>Contact details are shared only through verified claims.</small></p></div>
        {submitted ? <div className="success-panel"><span><Check size={18} /></span><div><strong>Your claim is in review.</strong><p>Campus staff will verify the identifying details and contact you through your preferred method.</p></div></div> : item.type === 'Found' && item.verificationStatus === 'verified' && !item.isOwner && !['Claimed', 'Recovered', 'Closed'].includes(item.status) ? <button className="button button-primary claim-cta" onClick={() => user ? setClaiming((value) => !value) : navigate('/login', { state: { from: { pathname: `/items/${item._id}` } } })}><HeartHandshake size={19} /> This is my item <ArrowRight size={17} /></button> : item.type === 'Found' ? <div className="details-help"><Sparkles size={18} /><p>This report is no longer open for new claims.</p></div> : <div className="details-help"><Sparkles size={18} /><p>Have you found this item? <Link to="/report/found">Report it here</Link> so the owner can see.</p></div>}
        {possibleMatches.length > 0 && <div className="matches-inline"><span className="eyebrow">POSSIBLE MATCHES</span><h2>Worth a closer look</h2>{possibleMatches.slice(0, 5).map((match) => <Link key={match.item._id} to={`/items/${match.item._id}`}><span><strong>{match.item.name}</strong><small>{match.factors?.slice(0, 3).map((factor) => factor.label).join(' · ')}</small></span><b>{match.score}%</b></Link>)}</div>}
        {claiming && <form className="claim-form card-panel" onSubmit={submitClaim}><div className="form-section-heading"><span className="eyebrow">OWNERSHIP CLAIM</span><h2>Tell us what makes it yours.</h2><p>Share private details a finder could not guess. Staff review this before contact information is shared.</p></div><label>Why do you believe this is your item? <textarea name="description" required minLength="12" maxLength="1200" rows="3" placeholder="Tell us when or where you last had it…" /></label><label>Identifying information <textarea name="identifyingInformation" required minLength="6" maxLength="1000" rows="3" placeholder="A serial number, scratch, contents, or another detail…" /></label><label>Additional description <textarea name="additionalDescription" maxLength="1200" rows="2" placeholder="Anything else that may help verify ownership" /></label><label>Best contact information <input name="contactInformation" required defaultValue={user?.email} placeholder="Email or phone number" /></label><label className="upload-control"><Upload size={17} /><span><strong>Optional proof image</strong><small>JPG, PNG, WEBP or GIF · up to 4 MB</small></span><input type="file" name="proof" accept="image/png,image/jpeg,image/webp,image/gif" /></label><SubmitButton loading={submitting}>Submit claim <ArrowRight size={17} /></SubmitButton></form>}
      </div>
    </div>
  </div></section>;
}

export function ReportPage({ type }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const [matches, setMatches] = useState([]);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const form = new FormData(event.currentTarget);
      form.set('type', type);
      const { data } = await api.post('/items', form);
      setDone(data.item);
      setMatches(data.matches || []);
      toast(type === 'Lost' ? 'Lost item reported successfully.' : 'Found item reported successfully.');
      await navigate(`/items/${data.item._id}`, { replace: true, state: { matches: data.matches || [], reportId: data.item.reportId } });
    } catch (error) {
      toast(getErrorMessage(error, 'Your report could not be submitted.'), 'error');
    } finally { setLoading(false); }
  };
  return <section className="report-page page-section"><div className="shell report-shell">
    <div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Report {type.toLowerCase()} item</span></div>
    <div className="report-layout"><div className="report-intro"><span className="eyebrow">LET’S GET IT BACK</span><h1>{type === 'Lost' ? 'Tell us what you’re missing.' : 'Help something find its way home.'}</h1><p>{type === 'Lost' ? 'A few helpful details can make all the difference. Your private contact information is never shown publicly.' : 'Thank you for looking out for your campus community. The owner can share private details to verify a claim.'}</p><div className="report-assurance"><span><ShieldCheck size={18} /></span><div><strong>Your details stay yours</strong><p>Only the item details you choose are visible in public listings. Contact information stays private.</p></div></div><div className="report-steps"><span><i>1</i> Share the item details</span><span><i>2</i> Campus staff review your report</span><span><i>3</i> Get notified about possible matches</span></div></div>
      <form className="report-form card-panel" onSubmit={submit} encType="multipart/form-data"><div className="form-section-heading"><span className="eyebrow">{type.toUpperCase()} REPORT</span><h2>Item details</h2><p>Fields marked with <b>*</b> are required.</p></div>
        <label>Item name <b>*</b><input name="name" required minLength="2" maxLength="120" placeholder="e.g. Blue water bottle" /></label>
        <div className="form-row"><label>Category <b>*</b><select name="category" required defaultValue=""><option value="" disabled>Choose a category</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Brand, if known<input name="brand" maxLength="100" placeholder="e.g. JBL, Apple" /></label></div>
        <div className="form-row"><label>Color<input name="color" maxLength="80" placeholder="e.g. Navy blue" /></label><label>Campus location <b>*</b><input name="location" required maxLength="160" placeholder={type === 'Lost' ? 'Where did you last see it?' : 'Where did you find it?'} /></label></div>
        <div className="form-row"><label>{type === 'Lost' ? 'Date lost' : 'Date found'} <b>*</b><input type="date" name="date" required max={today} defaultValue={today} /></label><label>Approximate time<input type="time" name="time" /></label></div>
        <label>Description <b>*</b><textarea name="description" required minLength="10" maxLength="1800" rows="4" placeholder="Describe the item and anything that makes it recognizable…" /></label>
        <label>Identifying features<textarea name="identifyingFeatures" maxLength="1000" rows="2" placeholder="A case, engraving, sticker or other unique detail" /></label>
        <label className="upload-control"><Upload size={18} /><span><strong>Add a photo</strong><small>Optional · JPG, PNG, WEBP or GIF · up to 4 MB</small></span><input type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif" /></label>
        <label>Preferred contact method<select name="contactPreference" defaultValue="In-app"><option>In-app</option><option>Email</option><option>Phone</option></select><small className="field-hint">Your actual phone and email are kept private until campus verification.</small></label>
        <div className="form-privacy"><ShieldCheck size={16} /><span>Campus staff verify new reports before they appear in public search.</span></div>
        <SubmitButton loading={loading}>{type === 'Lost' ? 'Submit lost report' : 'Submit found report'} <ArrowRight size={17} /></SubmitButton>
      </form>
    </div>

  </div></section>;
}

export function LoginPage() {
  const { login, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (user) navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true }); }, [user]);
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const account = await login(form.get('email'), form.get('password'));
      toast(`Welcome back, ${account.name.split(' ')[0]}.`);
      const next = location.state?.from?.pathname;
      navigate(next || (account.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };
  return <section className="auth-page"><div className="auth-art"><div className="auth-art-copy"><span className="eyebrow">A CAMPUS THAT LOOKS OUT FOR YOU</span><h1>We’re better<br />when we <em>find</em><br />each other.</h1><p>Your trusted place to report, search and reunite campus belongings.</p><div className="auth-art-proof"><span><ShieldCheck size={17} /> Privacy first</span><span><HeartHandshake size={17} /> People powered</span></div></div><span className="auth-decor auth-decor-one" /><span className="auth-decor auth-decor-two" /></div><div className="auth-form-side"><div className="auth-form-wrap"><Link className="auth-back" to="/">← Back to campusfound</Link><span className="eyebrow">WELCOME BACK</span><h2>Log in to your account</h2><p className="auth-subtitle">Pick up where you left off.</p>{error && <div className="form-error"><span>!</span>{error}</div>}
    <form className="auth-form" onSubmit={submit}><label>Email address<input type="email" name="email" required autoComplete="email" placeholder="you@college.edu" /></label><label>Password<input type="password" name="password" required autoComplete="current-password" placeholder="Enter your password" /></label><div className="auth-inline"><span><ShieldCheck size={14} /> Secure campus access</span></div><SubmitButton loading={loading} className="button-full">Log in <ArrowRight size={17} /></SubmitButton></form>
    {import.meta.env.DEV && <div className="demo-access"><strong>Demo accounts</strong><div><span>Student</span><code>student@example.com</code><code>Student@123</code></div><div><span>Admin</span><code>admin@example.com</code><code>Admin@123</code></div></div>}
    <p className="auth-switch">New to Campus Found? <Link to="/register">Create an account</Link></p>
  </div></div></section>;
}

export function RegisterPage() {
  const { register, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (user) navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true }); }, [user]);
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      await register(payload);
      toast('Your Campus Found account is ready.');
      navigate('/dashboard', { replace: true });
    } catch (err) { setError(err.response?.data?.errors?.[0]?.message || getErrorMessage(err)); }
    finally { setLoading(false); }
  };
  return <section className="auth-page"><div className="auth-art auth-art-register"><div className="auth-art-copy"><span className="eyebrow">BE PART OF THE REUNION</span><h1>Every campus<br />is a little more<br /><em>connected.</em></h1><p>Join the community that helps good things find their way home.</p><div className="auth-art-proof"><span><BadgeCheck size={17} /> Verified reports</span><span><KeyRound size={17} /> Private claims</span></div></div><span className="auth-decor auth-decor-one" /><span className="auth-decor auth-decor-two" /></div><div className="auth-form-side"><div className="auth-form-wrap"><Link className="auth-back" to="/">← Back to campusfound</Link><span className="eyebrow">GET STARTED</span><h2>Create your account</h2><p className="auth-subtitle">A few details and you’re part of the community.</p>{error && <div className="form-error"><span>!</span>{error}</div>}
    <form className="auth-form" onSubmit={submit}><label>Full name<input name="name" required minLength="2" maxLength="90" autoComplete="name" placeholder="e.g. Aditi Sharma" /></label><label>College email<input type="email" name="email" required autoComplete="email" placeholder="you@college.edu" /></label><div className="form-row"><label>Phone number<input type="tel" name="phone" required minLength="7" maxLength="30" autoComplete="tel" placeholder="+91 98765 43210" /></label><label>Department<input name="department" required minLength="2" maxLength="100" placeholder="e.g. Computer Science" /></label></div><label>Password<input type="password" name="password" required minLength="8" autoComplete="new-password" placeholder="At least 8 characters" /><small className="field-hint">Use uppercase, lowercase, a number and a special character.</small></label><label>Confirm password<input type="password" name="confirmPassword" required autoComplete="new-password" placeholder="Re-enter your password" /></label><SubmitButton loading={loading} className="button-full">Create account <ArrowRight size={17} /></SubmitButton></form>
    <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
  </div></div></section>;
}

export function InfoPage({ kind }) {
  if (kind === 'not-found') return <section className="shell page-section"><div className="not-found"><span className="eyebrow">404 · A LITTLE DETOUR</span><h1>This page has gone missing.</h1><p>But you’re in the right place to find things. Head back to the home page or browse campus reports.</p><div><Link className="button button-primary" to="/">Go home</Link><Link className="button button-secondary" to="/search">Browse items</Link></div></div></section>;
  const isHow = kind === 'how';
  const items = isHow ? [
    ['Report a lost or found item', 'Add the name, location, date and a few useful identifying details. Photos are optional.'],
    ['Search verified reports', 'Browse by category, campus location, date and keywords. New reports stay private until reviewed.'],
    ['Submit an ownership claim', 'For found belongings, share the details that prove it belongs to you. Claims are private.'],
    ['Campus staff verify', 'Administrators review reports and claims, request more information and notify everyone involved.'],
    ['Arrange a safe recovery', 'Coordinate the hand-off with campus staff, then mark the item recovered.'],
  ] : [
    ['Built for campus, not the open internet', 'Campus Found gives students, staff and administrators one place to manage lost and found belongings.'],
    ['Useful matches, understandable logic', 'A transparent rule-based score compares item name, category, brand, color, campus location, description and dates.'],
    ['Privacy at every step', 'Public reports do not reveal a person’s phone or email. Claims and supporting proof are restricted to their owner and campus administrators.'],
  ];
  return <section className="info-page page-section"><div className="shell"><div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>{isHow ? 'How it works' : 'About'}</span></div><div className="info-hero"><span className="eyebrow">{isHow ? 'CLEAR FROM THE START' : 'A SMALL IDEA, A BETTER CAMPUS'}</span><h1>{isHow ? <>A thoughtful path<br />from <em>lost</em> to found.</> : <>Good things find<br /><em>their way back.</em></>}</h1><p>{isHow ? 'We keep reports, claims and hand-offs clear so campus members can focus on what matters.' : 'Campus Found is a campus-first lost and found platform that helps belongings and owners find each other with care and verification.'}</p></div><div className="info-steps">{items.map(([title, copy], index) => <article key={title}><span className="info-number">0{index + 1}</span><div><h2>{title}</h2><p>{copy}</p></div><ArrowDownRight size={20} /></article>)}</div><div className="info-end"><BookOpen size={22} /><p><strong>Made for real life on campus.</strong><br />Report, search, claim and recover — with a human verification step in the middle.</p><Link className="text-link" to="/search">Explore reports <ArrowRight size={17} /></Link></div></div></section>;
}
