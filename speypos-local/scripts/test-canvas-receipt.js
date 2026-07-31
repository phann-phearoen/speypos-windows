#!/usr/bin/env node
/**
 * Canvas Receipt Renderer — Visual Preview Test
 *
 * Renders a sample receipt using the new Canvas ESC/POS engine and saves it
 * as a PNG image for visual inspection — no printer required.
 *
 * Usage:
 *   node scripts/test-canvas-receipt.js
 *   node scripts/test-canvas-receipt.js --variant=VOID
 *   node scripts/test-canvas-receipt.js --variant=INTERNAL --lang=km
 *
 * Output:
 *   data/receipts/preview-INTERNAL.png
 *   data/receipts/preview-VOID.png
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const variantArg = args.find((a) => a.startsWith('--variant='))?.split('=')[1] || 'INTERNAL';
const langArg = args.find((a) => a.startsWith('--lang='))?.split('=')[1] || 'en';
const variant = ['INTERNAL', 'VOID'].includes(variantArg.toUpperCase())
  ? variantArg.toUpperCase()
  : 'INTERNAL';

// ── Register Khmer font ───────────────────────────────────────────────────────
const khmerFontPath = path.resolve(projectRoot, 'src/printer/fonts/Khmer-Regular.ttf');
if (fs.existsSync(khmerFontPath)) {
  GlobalFonts.registerFromPath(khmerFontPath, 'Khmer');
  console.log('✔ Khmer font registered.');
} else {
  console.warn('⚠ Khmer font not found at:', khmerFontPath);
}

// ── Mock order data ───────────────────────────────────────────────────────────
const mockOrder = {
  id: 'abc123-def456',
  order_number: 42,
  status: variant === 'VOID' ? 'voided' : 'completed',
  created_at: new Date('2026-06-17T10:30:00+07:00').toISOString(),
  total_amount: 1250, // $12.50 in minor units (cents)
  void_reason: 'mistake',
  void_note: 'Customer changed their mind.',
  voided_at: new Date('2026-06-17T10:35:00+07:00').toISOString(),
  staff: { id: 's1', name: 'Sopheap' },
  voided_by_staff: { id: 's1', name: 'Sopheap' },
  payments: [{ payment_type: 'Cash', amount: 1500 }],
  items: [
    {
      id: 'item-1',
      menu_item_name: langArg === 'km' ? 'កាហ្វេទឹកដោះគោ' : 'Latte',
      quantity: 2,
      customizations: [{ value: 'Hot' }, { value: 'Less Sugar' }],
      toppings: [],
    },
    {
      id: 'item-2',
      menu_item_name: langArg === 'km' ? 'កាហ្វេទឹកដោះគោ' : 'Latte',
      quantity: 1,
      customizations: [{ value: 'Iced' }],
      toppings: [{ name: 'Vanilla Syrup', quantity: 2, unit_label: 'qty' }],
    },
    {
      id: 'item-3',
      menu_item_name: langArg === 'km' ? 'តែទឹកក' : 'Iced Tea',
      quantity: 1,
      customizations: [{ value: 'Less Sweet' }],
      toppings: [
        { name: 'Boba', quantity: 1, unit_label: 'qty' },
        { name: 'Whipped Cream', quantity: null, unit_label: null },
      ],
    },
  ],
};

// ── Inline renderer (self-contained — mirrors canvasReceiptRenderer.js logic) ─
const FIXED_WIDTH = 576;
const FONT_TITLE = 16;
const FONT_BODY = 12;
const FONT_TOTAL = 14;
const LINE_HEIGHT = 18;
const PADDING_X = 10;
const PADDING_TOP = 8;
const PADDING_BOTTOM = 12;
const FONT_FAMILY = '"Khmer", Arial, sans-serif';

const locEn = {
  title: 'Order Receipt',
  order_id: 'Order ID: {orderId}',
  items_header: 'Items',
  thank_you: 'Thank you!',
  void_reason_label: 'Reason',
  void_note_label: 'Note',
  voided_by_label: 'Voided by',
  voided_at_label: 'Voided at',
  original_created_label: 'Created at',
  status_voided: 'Voided',
  total: 'Total: {total}',
  void_reasons: { mistake: 'Mistake', staff_consumption: 'Staff consumption', other: 'Other' },
};

const l = locEn;

function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en');
}

function groupItemsByName(items) {
  const g = new Map();
  for (const item of items) {
    if (!g.has(item.menu_item_name)) g.set(item.menu_item_name, []);
    g.get(item.menu_item_name).push(item);
  }
  return g;
}

function buildVariantLine(item) {
  const cv = (item.customizations || []).map((c) => c.value).filter(Boolean);
  const tv = (item.toppings || [])
    .map((t) => {
      if (t.quantity != null) {
        return t.unit_label === 'qty' || !t.unit_label
          ? `${t.name} x${t.quantity}`
          : `${t.name} ${t.quantity} ${t.unit_label}`;
      }
      return t.name;
    })
    .filter(Boolean);
  const details = [...cv, ...tv].join(', ');
  return details ? `  - (${details}) x${item.quantity}` : `  - x${item.quantity}`;
}

function calculateHeight(groupedItems, isVoided) {
  let h = PADDING_TOP;
  h += LINE_HEIGHT + 4;
  if (isVoided) h += LINE_HEIGHT;
  h += 4 + LINE_HEIGHT + LINE_HEIGHT + 6;
  h += LINE_HEIGHT + 4;
  for (const [, vs] of groupedItems) {
    h += LINE_HEIGHT + vs.length * LINE_HEIGHT;
  }
  h += 6 + 1 + 4;
  if (isVoided) {
    h += LINE_HEIGHT * 2 + 6 + LINE_HEIGHT * 2;
  } else {
    h += LINE_HEIGHT + LINE_HEIGHT + 2;
  }
  h += 8 + LINE_HEIGHT + PADDING_BOTTOM;
  return Math.ceil(h);
}

function setFont(ctx, size, weight = 'normal') {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
}

function drawText(ctx, text, x, y, size = FONT_BODY, weight = 'normal') {
  setFont(ctx, size, weight);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  ctx.fillText(String(text), x, y);
}

function drawCentered(ctx, text, y, size = FONT_BODY, weight = 'normal') {
  setFont(ctx, size, weight);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  const w = ctx.measureText(String(text)).width;
  ctx.fillText(String(text), Math.max(0, (FIXED_WIDTH - w) / 2), y);
}

function drawRight(ctx, text, y, size = FONT_BODY, weight = 'normal') {
  setFont(ctx, size, weight);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  const w = ctx.measureText(String(text)).width;
  ctx.fillText(String(text), FIXED_WIDTH - PADDING_X - w, y);
}

function drawHLine(ctx, y) {
  ctx.beginPath();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.moveTo(PADDING_X, y);
  ctx.lineTo(FIXED_WIDTH - PADDING_X, y);
  ctx.stroke();
}

function renderReceiptPreview(order, variant) {
  const isVoided = variant === 'VOID' || order.status === 'voided';
  const grouped = groupItemsByName(order.items || []);
  const height = calculateHeight(grouped, isVoided);

  const canvas = createCanvas(FIXED_WIDTH, height);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, FIXED_WIDTH, height);

  let y = PADDING_TOP;

  // Title
  const title = isVoided ? `${l.title} (${l.status_voided})` : l.title;
  drawCentered(ctx, title, y, FONT_TITLE, 'bold');
  y += LINE_HEIGHT + 4;

  // Order ID + Date
  const orderNum = Number(order.order_number);
  const orderId = Number.isFinite(orderNum) && orderNum > 0
    ? (orderNum <= 999 ? `#${String(orderNum).padStart(3, '0')}` : `#${orderNum}`)
    : `#${order.id.split('-')[0]}`;

  drawText(ctx, `Order ID: ${orderId}`, PADDING_X, y, FONT_BODY);
  y += LINE_HEIGHT;

  const dateLabel = isVoided ? (l.original_created_label || 'Created at') : 'Date';
  drawText(ctx, `${dateLabel}: ${formatDate(order.created_at)}`, PADDING_X, y, FONT_BODY);
  y += LINE_HEIGHT + 6;

  // Items header
  drawText(ctx, `${l.items_header}:`, PADDING_X, y, FONT_BODY, 'bold');
  y += LINE_HEIGHT + 4;

  // Grouped items
  for (const [productName, variants] of grouped) {
    drawText(ctx, `* ${productName}`, PADDING_X, y, FONT_BODY, 'bold');
    y += LINE_HEIGHT;
    for (const item of variants) {
      drawText(ctx, buildVariantLine(item), PADDING_X, y, FONT_BODY);
      y += LINE_HEIGHT;
    }
  }

  y += 6;
  drawHLine(ctx, y);
  y += 4;

  // Totals / void metadata
  if (isVoided) {
    drawText(ctx, `${l.void_reason_label}: ${l.void_reasons?.[order.void_reason] || order.void_reason || 'N/A'}`, PADDING_X, y, FONT_BODY);
    y += LINE_HEIGHT;
    drawText(ctx, `${l.void_note_label}: ${order.void_note || '—'}`, PADDING_X, y, FONT_BODY);
    y += LINE_HEIGHT + 6;
    drawText(ctx, `${l.voided_by_label}: ${order.voided_by_staff?.name || 'Unknown'}`, PADDING_X, y, FONT_BODY);
    y += LINE_HEIGHT;
    drawText(ctx, `${l.voided_at_label}: ${formatDate(order.voided_at)}`, PADDING_X, y, FONT_BODY);
    y += LINE_HEIGHT;
  } else {
    const paymentType = order.payments?.[0]?.payment_type || '—';
    drawText(ctx, `Payment Type: ${paymentType}`, PADDING_X, y, FONT_BODY);
    drawRight(ctx, `Total: ${formatMoney(order.total_amount)}`, y, FONT_TOTAL, 'bold');
    y += LINE_HEIGHT + 2;
  }

  y += 8;
  drawCentered(ctx, l.thank_you || 'Thank you!', y, FONT_BODY);

  return canvas;
}

// ── Save PNG preview ──────────────────────────────────────────────────────────
const receiptsDir = path.resolve(projectRoot, 'data/receipts');
fs.mkdirSync(receiptsDir, { recursive: true });

console.log(`\nRendering receipt preview...`);
console.log(`  Variant : ${variant}`);
console.log(`  Language: ${langArg}`);
console.log(`  Items   : ${mockOrder.items.length} line items`);

const canvas = renderReceiptPreview(mockOrder, variant);
const outPath = path.join(receiptsDir, `preview-${variant}.png`);
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buffer);

console.log(`\n✔ Preview saved: ${outPath}`);
console.log(`  Canvas size: ${canvas.width} × ${canvas.height}px`);
console.log(`  File size  : ${(buffer.byteLength / 1024).toFixed(1)} KB`);
console.log(`\nOpen the file to visually inspect the receipt layout.`);
console.log(`  macOS: open "${outPath}"`);
