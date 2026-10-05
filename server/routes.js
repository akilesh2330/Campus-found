import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { User, Item, Claim, Notification, Recovery } from './models.js';
import { authRequired, optionalAuth, adminOnly, issueToken, safeUser } from './auth.js';
import { rankMatches } from './matching.js';
import { uploadClaimProof, uploadItemImage, uploadProfileImage, uploadRoot } from './uploads.js';

export const api = Router();
const categories = ['Electronics', 'Mobile Phones', 'Laptops', 'ID Cards', 'Wallets', 'Bags', 'Books', 'Accessories', 'Keys', 'Watches', 'Documents', 'Other'];
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many sign-in attempts. Please wait a few minutes and try again.' } });

function parseBody(schema, req) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const error = new Error('Please check the highlighted fields and try again.');
    error.status = 400;
    error.details = result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
    throw error;
  }
  return result.data;
}

function publicItem(item, includeOwner = false) {
  const value = item.toObject ? item.toObject() : item;
  const owner = value.userId && typeof value.userId === 'object' ? { name: value.userId.name } : undefined;
  return {
    _id: String(value._id), reportId: value.reportId, type: value.type, name: value.name,
    category: value.category, description: value.description, brand: value.brand, color: value.color,
    location: value.location, date: value.date, time: value.time, identifyingFeatures: value.identifyingFeatures,
    image: value.image, contactPreference: value.contactPreference, status: value.status,
    verificationStatus: value.verificationStatus,
    ...(includeOwner && owner ? { user: owner } : {}),
    createdAt: value.createdAt, updatedAt: value.updatedAt,
  };
}

const stringifyReference = (reference) => reference == null ? '' : String(reference._id ?? reference);

function publicClaim(claim) {
  const value = claim.toObject ? claim.toObject() : claim;
  return {
    _id: String(value._id), claimId: value.claimId, itemId: stringifyReference(value.itemId), claimantId: stringifyReference(value.claimantId),
    description: value.description, identifyingInformation: value.identifyingInformation,
    additionalDescription: value.additionalDescription, proof: value.proof ? `/claims/${value._id}/proof` : '',
    contactInformation: value.contactInformation, status: value.status, adminComment: value.adminComment,
    createdAt: value.createdAt, updatedAt: value.updatedAt,
  };
}

async function notify(userId, title, message, type = 'system', referenceId = null) {
  if (!userId) return;
  await Notification.create({ userId, title, message, type, referenceId });
}

async function matchVerifiedReport(item) {
  if (item.type === 'Lost') {
    const found = await Item.find({ type: 'Found', verificationStatus: 'verified', status: { $nin: ['Claimed', 'Recovered', 'Closed'] } }).limit(400);
    const best = rankMatches(item, found, 1)[0];
    if (best?.score >= 45) {
      item.status = 'Matched';
      await item.save();
      await notify(item.userId, 'A possible match was found', `Your report ${item.reportId} may match a found item (${best.score}% similarity). Review the matching factors in your dashboard.`, 'match', best.item._id);
    }
    return;
  }

  const lostReports = await Item.find({ type: 'Lost', verificationStatus: 'verified', status: { $nin: ['Recovered', 'Closed'] } }).limit(400);
  let foundMatch = false;
  for (const lost of lostReports) {
    const match = rankMatches(lost, [item], 1)[0];
    if (!match || match.score < 45) continue;
    foundMatch = true;
    lost.status = 'Matched';
    await lost.save();
    await notify(lost.userId, 'A possible match was found', `Your report ${lost.reportId} may match found report ${item.reportId} (${match.score}% similarity).`, 'match', item._id);
    await notify(item.userId, 'A possible match was found', `Found report ${item.reportId} may match a verified lost report (${match.score}% similarity).`, 'match', lost._id);
  }
  if (foundMatch) {
    item.status = 'Matched';
    await item.save();
  }
}

async function findItem(id) {
  const by = /^LF-\d{4}-[A-F0-9]+$/i.test(id) ? { reportId: id.toUpperCase() } : /^[A-F0-9]{24}$/i.test(id) ? { _id: id } : null;
  if (!by) return null;
  return Item.findOne(by);
}

function itemQuery(query, admin = false) {
  const filter = {};
  if (!admin) {
    filter.verificationStatus = 'verified';
    filter.status = { $nin: ['Recovered', 'Closed'] };
  }
  if (query.type && ['Lost', 'Found'].includes(query.type)) filter.type = query.type;
  if (query.category && categories.includes(query.category)) filter.category = query.category;
  if (query.status) filter.status = !admin && ['Recovered', 'Closed'].includes(query.status) ? { $in: [] } : query.status;
  if (query.location) filter.location = { $regex: escapeRegex(query.location), $options: 'i' };
  if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = new Date(query.dateFrom);
    if (query.dateTo) {
      const end = new Date(query.dateTo);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }
  if (query.q || query.keyword || query.name || query.brand || query.color) {
    const text = query.q || query.keyword || query.name || query.brand || query.color;
    const expression = { $regex: escapeRegex(text), $options: 'i' };
    filter.$or = ['name', 'description', 'brand', 'color', 'location', 'identifyingFeatures'].map((field) => ({ [field]: expression }));
  }
  return filter;
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
}

function pagination(query) {
  const page = Math.max(1, Math.min(10_000, Number.parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(48, Number.parseInt(query.limit, 10) || 12));
  const sort = query.sort === 'oldest' ? { date: 1, createdAt: 1 } : query.sort === 'updated' ? { updatedAt: -1 } : { date: -1, createdAt: -1 };
  return { page, limit, skip: (page - 1) * limit, sort };
}

async function listItems(query, admin = false) {
  const { page, limit, skip, sort } = pagination(query);
  const filter = itemQuery(query, admin);
  const [items, total] = await Promise.all([
    Item.find(filter).populate('userId', 'name').sort(sort).skip(skip).limit(limit),
    Item.countDocuments(filter),
  ]);
  return { items: items.map((item) => publicItem(item, admin)), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

const registerSchema = z.object({
  name: z.string().trim().min(2).max(90),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().min(7).max(30),
  department: z.string().trim().min(2).max(100),
  password: z.string().min(8).max(100).regex(/[a-z]/, 'Password must include a lowercase letter.').regex(/[A-Z]/, 'Password must include an uppercase letter.').regex(/[0-9]/, 'Password must include a number.').regex(/[^A-Za-z0-9]/, 'Password must include a special character.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(100) });
const itemSchema = z.object({
  type: z.enum(['Lost', 'Found']),
  name: z.string().trim().min(2).max(120),
  category: z.string().refine((value) => categories.includes(value), 'Choose a valid category.'),
  description: z.string().trim().min(10).max(1800),
  brand: z.string().trim().max(100).optional().default(''),
  color: z.string().trim().max(80).optional().default(''),
  location: z.string().trim().min(2).max(160),
  date: z.coerce.date(),
  time: z.string().trim().max(40).optional().default(''),
  identifyingFeatures: z.string().trim().max(1000).optional().default(''),
  contactPreference: z.enum(['Email', 'Phone', 'In-app']).optional().default('In-app'),
});
const claimSchema = z.object({
  description: z.string().trim().min(12).max(1200),
  identifyingInformation: z.string().trim().min(6).max(1000),
  additionalDescription: z.string().trim().max(1200).optional().default(''),
  contactInformation: z.string().trim().min(5).max(180),
});

api.get('/health', (_req, res) => res.json({ ok: true, service: 'campus-found-api', database: 'connected' }));
api.get('/stats/public', async (_req, res) => {
  const [lost, found, recovered, users] = await Promise.all([
    Item.countDocuments({ type: 'Lost', verificationStatus: 'verified', status: { $nin: ['Closed'] } }),
    Item.countDocuments({ type: 'Found', verificationStatus: 'verified', status: { $nin: ['Closed'] } }),
    Recovery.countDocuments(),
    User.countDocuments({ isActive: true }),
  ]);
  res.json({ lost, found, recovered, users });
});

api.post('/auth/register', authLimiter, async (req, res) => {
  const data = parseBody(registerSchema, req);
  const email = data.email.toLowerCase();
  if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
  const user = await User.create({
    name: data.name, email, phone: data.phone, department: data.department,
    password: await bcrypt.hash(data.password, 12), role: 'user',
  });
  await notify(user._id, 'Welcome to Campus Found', 'Your account is ready. Start by reporting a lost or found item.', 'system');
  res.status(201).json({ token: issueToken(user), user: safeUser(user) });
});

api.post('/auth/login', authLimiter, async (req, res) => {
  const data = parseBody(loginSchema, req);
  const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password');
  if (!user || !user.isActive || !(await bcrypt.compare(data.password, user.password))) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  res.json({ token: issueToken(user), user: safeUser(user) });
});

api.get('/auth/me', authRequired, (req, res) => res.json({ user: safeUser(req.user) }));
api.post('/auth/logout', authRequired, (_req, res) => res.json({ message: 'You have been signed out.' }));
api.put('/auth/profile', authRequired, uploadProfileImage, async (req, res) => {
  const schema = z.object({ name: z.string().trim().min(2).max(90), phone: z.string().trim().min(7).max(30), department: z.string().trim().min(2).max(100) });
  const data = parseBody(schema, req);
  req.user.name = data.name;
  req.user.phone = data.phone;
  req.user.department = data.department;
  if (req.file) req.user.profileImage = `/uploads/profiles/${req.file.filename}`;
  await req.user.save();
  res.json({ user: safeUser(req.user) });
});

api.get('/items', async (req, res) => res.json(await listItems(req.query)));
api.get('/items/mine', authRequired, async (req, res) => {
  const { page, limit, skip, sort } = pagination(req.query);
  const filter = { userId: req.user._id, ...(req.query.type && ['Lost', 'Found'].includes(req.query.type) ? { type: req.query.type } : {}) };
  const [items, total] = await Promise.all([Item.find(filter).sort(sort).skip(skip).limit(limit), Item.countDocuments(filter)]);
  res.json({ items: items.map(publicItem), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
api.get('/items/:id/matches', authRequired, async (req, res) => {
  const lost = await findItem(req.params.id);
  if (!lost) return res.status(404).json({ message: 'Item report not found.' });
  if (String(lost.userId) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ message: 'You can view possible matches for your own report only.' });
  if (lost.type !== 'Lost') return res.json({ matches: [] });
  const candidates = await Item.find({ type: 'Found', verificationStatus: 'verified', status: { $nin: ['Claimed', 'Recovered', 'Closed'] } }).limit(400).populate('userId', 'name');
  res.json({ matches: rankMatches(lost, candidates).map((match) => ({ ...match, item: publicItem(match.item) })) });
});
api.get('/items/:id', optionalAuth, async (req, res) => {
  const item = await findItem(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item report not found.' });
  const isOwnerOrAdmin = req.user && (String(item.userId) === String(req.user._id) || req.user.role === 'admin');
  const isPubliclyVisible = item.verificationStatus === 'verified' && !['Recovered', 'Closed'].includes(item.status);
  const canView = Boolean(isOwnerOrAdmin || isPubliclyVisible);
  if (!canView) return res.status(404).json({ message: 'Item report not found.' });
  const response = publicItem(item);
  if (req.user) response.isOwner = String(item.userId) === String(req.user._id);
  res.json({ item: response });
});
api.post('/items', authRequired, uploadItemImage, async (req, res) => {
  const data = parseBody(itemSchema, req);
  const item = await Item.create({
    ...data, userId: req.user._id, image: req.file ? `/uploads/items/${req.file.filename}` : '',
    status: 'Under Review', verificationStatus: 'pending',
  });
  let matches = [];
  if (item.type === 'Lost') {
    const found = await Item.find({ type: 'Found', verificationStatus: 'verified', status: { $nin: ['Claimed', 'Recovered', 'Closed'] } }).limit(400).populate('userId', 'name');
    matches = rankMatches(item, found);
  }
  const best = matches[0];
  if (best && best.score >= 45) {
    item.status = 'Matched';
    await item.save();
    await notify(req.user._id, 'Possible match found', `A found item matches your report by ${best.score}%. Review the matching factors in your dashboard.`, 'match', item._id);
  } else {
    await notify(req.user._id, 'Report submitted', `Report ${item.reportId} was submitted and is waiting for campus verification.`, 'report', item._id);
  }
  res.status(201).json({ item: publicItem(item), matches: matches.slice(0, 5).map((match) => ({ ...match, item: publicItem(match.item) })) });
});
api.put('/items/:id', authRequired, uploadItemImage, async (req, res) => {
  const item = await findItem(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item report not found.' });
  if (String(item.userId) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ message: 'You can edit only your own reports.' });
  if (['Claimed', 'Recovered', 'Closed'].includes(item.status)) return res.status(409).json({ message: 'A claimed, recovered or closed report can no longer be edited.' });
  const data = parseBody(itemSchema, req);
  const changes = { ...data, verificationStatus: 'pending', status: 'Under Review' };
  if (req.file) changes.image = `/uploads/items/${req.file.filename}`;
  const updatedItem = await Item.findOneAndUpdate(
    { _id: item._id, status: item.status, verificationStatus: item.verificationStatus },
    { $set: changes },
    { new: true },
  );
  if (!updatedItem) return res.status(409).json({ message: 'This report changed while you were editing it. Refresh and try again.' });
  await notify(updatedItem.userId, 'Report updated', `Your report ${updatedItem.reportId} was updated and sent for review again.`, 'report', updatedItem._id);
  res.json({ item: publicItem(updatedItem) });
});
api.delete('/items/:id', authRequired, async (req, res) => {
  const item = await findItem(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item report not found.' });
  if (String(item.userId) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ message: 'You can close only your own reports.' });
  if (['Recovered', 'Claimed'].includes(item.status)) return res.status(409).json({ message: 'This report has an active claim or recovery and cannot be removed.' });
  const closedItem = await Item.findOneAndUpdate(
    { _id: item._id, status: { $nin: ['Recovered', 'Claimed', 'Closed'] } },
    { $set: { status: 'Closed' } },
    { new: true },
  );
  if (!closedItem) return res.status(409).json({ message: 'This report changed and can no longer be closed. Refresh and try again.' });
  res.json({ message: 'The report has been closed.' });
});

api.get('/claims', authRequired, async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { claimantId: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const claims = await Claim.find(filter).populate('itemId').populate('claimantId', 'name email').sort({ createdAt: -1 }).limit(100);
  res.json({ claims: claims.map((claim) => ({ ...publicClaim(claim), item: claim.itemId ? publicItem(claim.itemId) : null, claimant: claim.claimantId ? safeUser(claim.claimantId) : null })) });
});
api.post('/claims/:itemId', authRequired, uploadClaimProof, async (req, res) => {
  const item = await findItem(req.params.itemId);
  if (!item || item.verificationStatus !== 'verified') return res.status(404).json({ message: 'Found item report not found.' });
  if (item.type !== 'Found' || ['Claimed', 'Recovered', 'Closed'].includes(item.status)) return res.status(409).json({ message: 'This item is not currently available to claim.' });
  if (String(item.userId) === String(req.user._id)) return res.status(400).json({ message: 'You cannot claim an item that you reported as found.' });
  const data = parseBody(claimSchema, req);
  if (await Claim.exists({ itemId: item._id, claimantId: req.user._id })) return res.status(409).json({ message: 'You have already submitted a claim for this item.' });
  const claim = await Claim.create({
    ...data, itemId: item._id, claimantId: req.user._id, proof: req.file?.filename || '', status: 'Pending',
  });
  await notify(req.user._id, 'Claim submitted', `Your claim ${claim.claimId} is waiting for campus verification.`, 'claim', claim._id);
  await notify(item.userId, 'A claim needs review', `A campus member submitted a claim for found report ${item.reportId}.`, 'claim', claim._id);
  res.status(201).json({ claim: publicClaim(claim) });
});
api.get('/claims/:id/proof', authRequired, async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim || !claim.proof) return res.status(404).json({ message: 'Proof file not found.' });
  if (String(claim.claimantId) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ message: 'You are not allowed to view this proof.' });
  const file = path.resolve(uploadRoot, 'claims', claim.proof);
  if (!existsSync(file)) return res.status(404).json({ message: 'Proof file is no longer available.' });
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(file);
});

api.get('/notifications', authRequired, async (req, res) => {
  const [notifications, unread] = await Promise.all([
    Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);
  res.json({ notifications, unread });
});
api.patch('/notifications/:id/read', authRequired, async (req, res) => {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true }, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ notification });
});
api.patch('/notifications/read-all', authRequired, async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: 'All notifications marked as read.' });
});

api.post('/items/:id/recover', authRequired, async (req, res) => {
  const item = await findItem(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item report not found.' });
  if (['Recovered', 'Closed'].includes(item.status)) return res.status(409).json({ message: 'This item is already closed or marked as recovered.' });
  const isReporter = String(item.userId) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';
  let claim = null;
  const requestedClaimId = req.body?.claimId;
  if (requestedClaimId) {
    if (!/^[A-F0-9]{24}$/i.test(String(requestedClaimId))) return res.status(400).json({ message: 'The claim reference is invalid.' });
    claim = await Claim.findById(requestedClaimId);
    if (!claim) return res.status(404).json({ message: 'Approved claim not found.' });
    if (String(claim.itemId) !== String(item._id) || claim.status !== 'Approved') return res.status(409).json({ message: 'Only an approved claim for this item can be linked to recovery.' });
  } else if (isReporter || isAdmin) {
    claim = await Claim.findOne({ itemId: item._id, status: 'Approved' }).sort({ updatedAt: -1 });
  } else {
    claim = await Claim.findOne({ itemId: item._id, claimantId: req.user._id, status: 'Approved' });
  }
  const isApprovedClaimant = claim && String(claim.itemId) === String(item._id) && claim.status === 'Approved' && String(claim.claimantId) === String(req.user._id);
  if (!isReporter && !isAdmin && !isApprovedClaimant) return res.status(403).json({ message: 'Only the report owner, an approved claimant, or an administrator can mark this item recovered.' });
  const recoveredItem = await Item.findOneAndUpdate(
    { _id: item._id, status: { $nin: ['Recovered', 'Closed'] } },
    { $set: { status: 'Recovered' } },
    { new: true },
  );
  if (!recoveredItem) return res.status(409).json({ message: 'This item was already recovered or closed.' });
  const recovery = await Recovery.create({ itemId: recoveredItem._id, claimId: claim?._id || null, userId: req.user._id, recoveredDate: new Date() });
  await notify(recoveredItem.userId, 'Item marked recovered', `Report ${recoveredItem.reportId} has been marked as recovered.`, 'recovery', recoveredItem._id);
  if (claim && String(claim.claimantId) !== String(recoveredItem.userId)) await notify(claim.claimantId, 'Item marked recovered', `The item linked to claim ${claim.claimId} has been marked as recovered.`, 'recovery', recoveredItem._id);
  res.json({ message: 'This item is now marked as recovered.', recovery });
});
api.get('/recoveries', authRequired, async (req, res) => {
  let filter = {};
  if (req.user.role !== 'admin') {
    const [itemIds, claimIds] = await Promise.all([
      Item.find({ userId: req.user._id }).distinct('_id'),
      Claim.find({ claimantId: req.user._id }).distinct('_id'),
    ]);
    filter = { $or: [{ userId: req.user._id }, { itemId: { $in: itemIds } }, { claimId: { $in: claimIds } }] };
  }
  const recoveries = await Recovery.find(filter).populate('itemId').populate('claimId', 'claimId status').sort({ recoveredDate: -1 }).limit(100);
  res.json({ recoveries: recoveries.map((record) => ({ ...record.toObject(), item: record.itemId ? publicItem(record.itemId) : null })) });
});

api.get('/dashboard', authRequired, async (req, res) => {
  const [ownedItemIds, userClaimIds] = await Promise.all([
    Item.find({ userId: req.user._id }).distinct('_id'),
    Claim.find({ claimantId: req.user._id }).distinct('_id'),
  ]);
  const [myItems, myClaims, unread, recoveredItems, notifications, totalLost, totalFound, activeClaims, approvedClaims] = await Promise.all([
    Item.find({ userId: req.user._id }).sort({ updatedAt: -1 }).limit(8),
    Claim.find({ claimantId: req.user._id }).populate('itemId').sort({ createdAt: -1 }).limit(8),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
    Recovery.countDocuments({ $or: [{ userId: req.user._id }, { itemId: { $in: ownedItemIds } }, { claimId: { $in: userClaimIds } }] }),
    Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5),
    Item.countDocuments({ userId: req.user._id, type: 'Lost' }),
    Item.countDocuments({ userId: req.user._id, type: 'Found' }),
    Claim.countDocuments({ claimantId: req.user._id, status: { $in: ['Pending', 'Under Review'] } }),
    Claim.countDocuments({ claimantId: req.user._id, status: 'Approved' }),
  ]);
  const lostReports = await Item.find({ userId: req.user._id, type: 'Lost', verificationStatus: 'verified', status: { $nin: ['Recovered', 'Closed'] } }).limit(12);
  const foundItems = await Item.find({ type: 'Found', verificationStatus: 'verified', status: { $nin: ['Recovered', 'Closed'] } }).limit(400).populate('userId', 'name');
  const matches = lostReports.flatMap((lostItem) => rankMatches(lostItem, foundItems, 3).map((match) => ({ lostReportId: lostItem.reportId, ...match, item: publicItem(match.item) }))).sort((a, b) => b.score - a.score).slice(0, 5);
  res.json({
    cards: { myLost: totalLost, myFound: totalFound, activeClaims, approvedClaims, recovered: recoveredItems },
    reports: myItems.map(publicItem), claims: myClaims.map((claim) => ({ ...publicClaim(claim), item: claim.itemId ? publicItem(claim.itemId) : null })),
    matches, notifications, unread,
  });
});

api.get('/admin/dashboard', authRequired, adminOnly, async (_req, res) => {
  const [users, lost, found, pendingReports, pendingClaims, recovered, active, categoryRows, monthRows, recoveryRows, activityItems, activityClaims] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Item.countDocuments({ type: 'Lost' }),
    Item.countDocuments({ type: 'Found' }),
    Item.countDocuments({ verificationStatus: 'pending' }),
    Claim.countDocuments({ status: { $in: ['Pending', 'Under Review'] } }),
    Recovery.countDocuments(),
    Item.countDocuments({ status: { $in: ['Active', 'Matched', 'Claimed'] } }),
    Item.aggregate([{ $group: { _id: '$category', value: { $sum: 1 } } }, { $sort: { value: -1 } }]),
    Item.aggregate([{ $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, lost: { $sum: { $cond: [{ $eq: ['$type', 'Lost'] }, 1, 0] } }, found: { $sum: { $cond: [{ $eq: ['$type', 'Found'] }, 1, 0] } } } }, { $sort: { _id: -1 } }, { $limit: 8 }]),
    Recovery.aggregate([{ $group: { _id: { $dateToString: { format: '%Y-%m', date: '$recoveredDate' } }, recovered: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 8 }]),
    Item.find().sort({ createdAt: -1 }).limit(6).populate('userId', 'name'),
    Claim.find().sort({ createdAt: -1 }).limit(4).populate('claimantId', 'name').populate('itemId', 'name reportId'),
  ]);
  const recentActivity = [
    ...activityItems.map((item) => ({ kind: 'report', title: `${item.type} report: ${item.name}`, description: item.userId?.name || 'Campus member', date: item.createdAt, status: item.verificationStatus })),
    ...activityClaims.map((claim) => ({ kind: 'claim', title: `Claim ${claim.claimId} submitted`, description: `${claim.claimantId?.name || 'Campus member'} · ${claim.itemId?.name || 'Item'}`, date: claim.createdAt, status: claim.status })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  const monthMap = new Map(monthRows.map((row) => [row._id, { month: row._id, lost: row.lost, found: row.found, recovered: 0 }]));
  for (const row of recoveryRows) {
    if (!monthMap.has(row._id)) monthMap.set(row._id, { month: row._id, lost: 0, found: 0, recovered: 0 });
    monthMap.get(row._id).recovered = row.recovered;
  }
  const monthly = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-8);
  res.json({ stats: { users, lost, found, pendingReports, pendingClaims, recovered, active }, byCategory: categoryRows.map((row) => ({ name: row._id, value: row.value })), monthly, recentActivity });
});

api.get('/admin/items', authRequired, adminOnly, async (req, res) => res.json(await listItems(req.query, true)));
api.put('/admin/items/:id', authRequired, adminOnly, async (req, res) => {
  const schema = z.object({ verificationStatus: z.enum(['verified', 'rejected']), adminComment: z.string().trim().max(500).optional().default('') });
  const data = parseBody(schema, req);
  const currentItem = await findItem(req.params.id);
  if (!currentItem) return res.status(404).json({ message: 'Item report not found.' });
  if (['Claimed', 'Recovered', 'Closed'].includes(currentItem.status)) return res.status(409).json({ message: 'This report is finalized and cannot be reopened through report verification.' });
  const wasVerified = currentItem.verificationStatus === 'verified';
  const nextStatus = data.verificationStatus === 'verified'
    ? (currentItem.status === 'Under Review' ? 'Active' : currentItem.status)
    : 'Closed';
  const item = await Item.findOneAndUpdate(
    { _id: currentItem._id, status: currentItem.status, verificationStatus: currentItem.verificationStatus },
    { $set: { verificationStatus: data.verificationStatus, status: nextStatus } },
    { new: true },
  );
  if (!item) return res.status(409).json({ message: 'This report changed during review. Refresh and try again.' });
  await notify(item.userId, data.verificationStatus === 'verified' ? 'Report approved' : 'Report not approved', data.adminComment || (data.verificationStatus === 'verified' ? `Your report ${item.reportId} is now verified and visible to the campus.` : `Your report ${item.reportId} was not approved by campus staff.`), 'report', item._id);
  if (data.verificationStatus === 'verified' && !wasVerified) await matchVerifiedReport(item);
  res.json({ item: publicItem(item) });
});
api.delete('/admin/items/:id', authRequired, adminOnly, async (req, res) => {
  const item = await findItem(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item report not found.' });
  if (['Claimed', 'Recovered'].includes(item.status)) return res.status(409).json({ message: 'A claimed or recovered report cannot be removed from its history.' });
  const closedItem = await Item.findOneAndUpdate(
    { _id: item._id, status: { $nin: ['Claimed', 'Recovered', 'Closed'] } },
    { $set: { status: 'Closed', verificationStatus: 'rejected' } },
    { new: true },
  );
  if (!closedItem) return res.status(409).json({ message: 'This report changed and can no longer be removed. Refresh and try again.' });
  await notify(closedItem.userId, 'Report closed by campus staff', `Report ${closedItem.reportId} is no longer listed.`, 'report', closedItem._id);
  res.json({ message: 'Report removed from active listings.' });
});

api.get('/admin/claims', authRequired, adminOnly, async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const claims = await Claim.find(filter).populate('itemId').populate('claimantId', 'name email phone department').sort({ createdAt: -1 }).limit(100);
  res.json({ claims: claims.map((claim) => ({ ...publicClaim(claim), item: claim.itemId ? publicItem(claim.itemId) : null, claimant: claim.claimantId ? safeUser(claim.claimantId) : null })) });
});
api.put('/admin/claims/:id', authRequired, adminOnly, async (req, res) => {
  const schema = z.object({ status: z.enum(['Under Review', 'Approved', 'Rejected']), adminComment: z.string().trim().max(1200).optional().default('') });
  const data = parseBody(schema, req);
  const claim = await Claim.findById(req.params.id).populate('itemId');
  if (!claim) return res.status(404).json({ message: 'Claim not found.' });
  if (['Approved', 'Rejected'].includes(claim.status)) return res.status(409).json({ message: 'This claim has already been finalized.' });
  let reservation = null;
  if (data.status === 'Approved') {
    if (!claim.itemId) return res.status(409).json({ message: 'This claim no longer has an available item.' });
    const itemId = claim.itemId._id;
    const previousStatus = claim.itemId.status;
    const reservedItem = await Item.findOneAndUpdate(
      { _id: itemId, type: 'Found', verificationStatus: 'verified', status: { $nin: ['Claimed', 'Recovered', 'Closed'] } },
      { $set: { status: 'Claimed' } },
      { new: true },
    );
    if (!reservedItem) return res.status(409).json({ message: 'This item is no longer available for approval.' });
    reservation = { itemId, previousStatus };
  }
  const savedClaim = await Claim.findOneAndUpdate(
    { _id: claim._id, status: { $in: ['Pending', 'Under Review'] } },
    { $set: { status: data.status, adminComment: data.adminComment } },
    { new: true },
  );
  if (!savedClaim) {
    if (reservation) await Item.updateOne({ _id: reservation.itemId, status: 'Claimed' }, { $set: { status: reservation.previousStatus } });
    return res.status(409).json({ message: 'This claim was updated by another reviewer. Refresh the claim queue and try again.' });
  }
  const messages = {
    'Under Review': data.adminComment || 'Campus staff need a little more information to review your claim. Please check your claim details.',
    Approved: data.adminComment || `Your claim ${savedClaim.claimId} was approved. Campus staff will help coordinate the hand-off.`,
    Rejected: data.adminComment || `Your claim ${savedClaim.claimId} was not approved. Contact campus support if you have questions.`,
  };
  await notify(savedClaim.claimantId, `Claim ${data.status.toLowerCase()}`, messages[data.status], 'claim', savedClaim._id);
  res.json({ claim: publicClaim(savedClaim) });
});

api.get('/admin/users', authRequired, adminOnly, async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (req.query.q) filter.$or = ['name', 'email', 'department'].map((field) => ({ [field]: { $regex: escapeRegex(req.query.q), $options: 'i' } }));
  if (req.query.active === 'true') filter.isActive = true;
  if (req.query.active === 'false') filter.isActive = false;
  const [users, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(filter)]);
  res.json({ users: users.map(safeUser), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
api.patch('/admin/users/:id/status', authRequired, adminOnly, async (req, res) => {
  const data = parseBody(z.object({ isActive: z.boolean() }), req);
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (String(user._id) === String(req.user._id) && !data.isActive) return res.status(400).json({ message: 'You cannot deactivate your own administrator account.' });
  if (user.role === 'admin' && !data.isActive && await User.countDocuments({ role: 'admin', isActive: true }) <= 1) return res.status(409).json({ message: 'The final active administrator cannot be deactivated.' });
  user.isActive = data.isActive;
  await user.save();
  res.json({ user: safeUser(user) });
});
api.delete('/admin/users/:id', authRequired, adminOnly, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (String(user._id) === String(req.user._id)) return res.status(400).json({ message: 'You cannot delete your own administrator account.' });
  if (user.role === 'admin' && await User.countDocuments({ role: 'admin', isActive: true }) <= 1) return res.status(409).json({ message: 'The final active administrator cannot be deleted.' });
  user.isActive = false;
  user.email = `deactivated-${user._id}@campus.invalid`;
  await user.save();
  res.json({ message: 'User deactivated. Existing reports and claims remain in the system history.' });
});
