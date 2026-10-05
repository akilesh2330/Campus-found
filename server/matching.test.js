import test from 'node:test';
import assert from 'node:assert/strict';
import { rankMatches, scoreMatch } from './matching.js';

const lost = {
  name: 'Black JBL Bluetooth earbuds', category: 'Accessories', brand: 'JBL', color: 'Black',
  location: 'Central Library study pods', date: '2026-09-26', description: 'Black earbuds in a charging case.', identifyingFeatures: 'small blue sticker',
};

test('matching score increases for a similar found report and explains contributing factors', () => {
  const strong = { ...lost, name: 'JBL black wireless earbuds', location: 'Central Library', date: '2026-09-27', description: 'Black JBL earbuds and charging case.' };
  const weak = { ...lost, name: 'Blue engineering textbook', category: 'Books', brand: 'Pearson', color: 'Blue', location: 'Sports Complex', date: '2026-07-01', description: 'Hardcover textbook.' };
  const good = scoreMatch(lost, strong);
  const poor = scoreMatch(lost, weak);
  assert.ok(good.score > poor.score);
  assert.ok(good.score >= 75);
  assert.ok(good.factors.some((factor) => factor.label === 'Category'));
  assert.ok(good.factors.every((factor) => factor.strength >= 34 && factor.strength <= 100));
});

test('ranking is descending and applies the minimum-similarity cutoff', () => {
  const reports = [
    { _id: 'weak', ...lost, name: 'Engineering mathematics textbook', category: 'Books', brand: 'Pearson', color: 'Blue', location: 'Main Hall', date: '2026-03-01' },
    { _id: 'strong', ...lost, name: 'Black JBL Bluetooth earbuds', location: 'Central Library study pods', date: '2026-09-26' },
  ];
  const ranked = rankMatches(lost, reports);
  assert.equal(ranked[0].item._id, 'strong');
  assert.ok(ranked.length <= 5);
});
