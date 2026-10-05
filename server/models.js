import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 90 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  department: { type: String, required: true, trim: true, maxlength: 100 },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  profileImage: { type: String, default: '' },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

const itemSchema = new Schema({
  reportId: {
    type: String,
    unique: true,
    index: true,
    default: () => `LF-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`,
  },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['Lost', 'Found'], required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, index: true },
  description: { type: String, required: true, trim: true, maxlength: 1800 },
  brand: { type: String, trim: true, default: '', maxlength: 100 },
  color: { type: String, trim: true, default: '', maxlength: 80 },
  location: { type: String, required: true, trim: true, maxlength: 160 },
  date: { type: Date, required: true, index: true },
  time: { type: String, trim: true, default: '' },
  identifyingFeatures: { type: String, trim: true, default: '', maxlength: 1000 },
  image: { type: String, default: '' },
  contactPreference: { type: String, enum: ['Email', 'Phone', 'In-app'], default: 'In-app' },
  status: { type: String, enum: ['Active', 'Under Review', 'Matched', 'Claimed', 'Recovered', 'Closed'], default: 'Under Review', index: true },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending', index: true },
}, { timestamps: true });

itemSchema.index({ type: 1, verificationStatus: 1, status: 1, date: -1 });
itemSchema.index({ category: 1, location: 1, date: -1 });
itemSchema.index({ name: 'text', description: 'text', brand: 'text', color: 'text', location: 'text', identifyingFeatures: 'text' });

const claimSchema = new Schema({
  claimId: {
    type: String,
    unique: true,
    index: true,
    default: () => `CL-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`,
  },
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  claimantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  description: { type: String, required: true, trim: true, maxlength: 1200 },
  identifyingInformation: { type: String, required: true, trim: true, maxlength: 1000 },
  additionalDescription: { type: String, trim: true, default: '', maxlength: 1200 },
  proof: { type: String, default: '' },
  contactInformation: { type: String, required: true, trim: true, maxlength: 180 },
  status: { type: String, enum: ['Pending', 'Under Review', 'Approved', 'Rejected'], default: 'Pending', index: true },
  adminComment: { type: String, trim: true, default: '', maxlength: 1200 },
}, { timestamps: true });
claimSchema.index({ itemId: 1, claimantId: 1 }, { unique: true });

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  type: { type: String, enum: ['report', 'match', 'claim', 'recovery', 'system'], default: 'system' },
  isRead: { type: Boolean, default: false, index: true },
  referenceId: { type: Schema.Types.ObjectId, default: null },
}, { timestamps: true });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const recoverySchema = new Schema({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  claimId: { type: Schema.Types.ObjectId, ref: 'Claim', default: null },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recoveredDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Recovered'], default: 'Recovered' },
}, { timestamps: true });

export const User = model('User', userSchema);
export const Item = model('Item', itemSchema);
export const Claim = model('Claim', claimSchema);
export const Notification = model('Notification', notificationSchema);
export const Recovery = model('Recovery', recoverySchema);
