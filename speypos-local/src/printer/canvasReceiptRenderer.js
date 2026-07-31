/**
 * Canvas-based ESC/POS Receipt Renderer
 *
 * Uses a direct in-memory canvas render for receipt printing.
 * Produces a raw ESC/POS binary buffer (GS v 0 raster image + cut command)
 * ready to be sent to a thermal printer via USB or TCP.
 *
 * Spec: receipt-printing-spec.yml (rendering_engine + formatting_logic)
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import * as storeService from '../services/store.service.js';
import { ORDER_STATUS } from '../constants/order.constants.js';
import en from '../localizations/en.json' with { type: 'json' };
import km from '../localizations/km.json' with { type: 'json' };

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const FIXED_WIDTH = 576; // 72mm × 8 dpmm = 576 dots
const FONT_TITLE = 24;
const FONT_BODY = 22;
const FONT_TOTAL = 24;
const LINE_HEIGHT = 30;
const PADDING_X = 10;
const PADDING_TOP = 8;
const PADDING_BOTTOM = 12;
const GRAYSCALE_THRESHOLD = 128; // per spec: esc_pos_implementation.thresholding

// Column widths (pixels) — 576 total usable
const COL_PRODUCT_W = Math.floor(FIXED_WIDTH * 0.55); // product name, 55%
const COL_TOTAL_W = FIXED_WIDTH - COL_PRODUCT_W; // right side, 45%

// ESC/POS command bytes
const ESC_POS_GS_V_0 = Buffer.from([0x1d, 0x76, 0x30, 0x00]); // GS v 0 m (normal)
const ESC_POS_CUT = Buffer.from([0x1d, 0x56, 0x41, 0x00]); // GS V A 0 (full cut + feed)

// ─────────────────────────────────────────────
// Font Registration
// ─────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let fontRegistered = false;

function ensureFont() {
  if (fontRegistered) return;
  const khmerFontPath = path.resolve(__dirname, 'fonts', 'Khmer-Regular.ttf');
  try {
    GlobalFonts.registerFromPath(khmerFontPath, 'Khmer');
    fontRegistered = true;
    logger.info('Khmer font registered for canvas renderer.');
  } catch (err) {
    logger.warn('Failed to register Khmer font for canvas renderer.', {
      path: khmerFontPath,
      error: err.message,
    });
  }
}

// ─────────────────────────────────────────────
// Localization
// ─────────────────────────────────────────────

const translations = { en, km };

function getLocalization() {
  const lang = storeService.getLanguage() || 'en';
  const loc = translations[lang] || translations.en;
  return loc.receipt;
}

// ─────────────────────────────────────────────
// Order Formatting Helpers
// ─────────────────────────────────────────────

function formatOrderId(order) {
  const n = Number(order?.order_number);
  if (Number.isFinite(n) && n > 0) {
    return n <= 999 ? `#${String(n).padStart(3, '0')}` : `#${n}`;
  }
  const id = order?.id || '';
  return `#${id.split('-')[0] || id}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(storeService.getLanguage() || 'en');
}

function formatVoidReason(reasonKey, l) {
  return l.void_reasons?.[reasonKey] || reasonKey || 'N/A';
}

// ─────────────────────────────────────────────
// Spec: formatting_logic.grouping_strategy
// ─────────────────────────────────────────────

/**
 * Groups order items by their base product name.
 * Spec: "Create a map where the key is the 'Product Name' and the
 *        value is a list of all order item instances with that name."
 *
 * @param {object[]} items
 * @returns {Map<string, object[]>}
 */
function groupItemsByName(items) {
  const groups = new Map();
  for (const item of items) {
    const name = item.menu_item_name;
    if (!groups.has(name)) {
      groups.set(name, []);
    }
    groups.get(name).push(item);
  }
  return groups;
}

/**
 * Builds the combined detail string for one variant line.
 * Spec: content_details.combined_display
 *   "Details are combined into a single string inside parentheses:
 *    '  - (Detail1, Detail2, Topping Name xQty) x [Item Quantity]'"
 *
 * @param {object} item
 * @returns {string}
 */
function buildVariantLine(item) {
  // Customizations: comma-separated list of values
  const customValues = (item.customizations || [])
    .map((c) => c.value)
    .filter(Boolean);

  // Toppings: "Name x2" or "Name qty unit"
  const toppingValues = (item.toppings || [])
    .map((t) => {
      if (t.quantity !== undefined && t.quantity !== null) {
        const unit = t.unit_label === 'qty' || !t.unit_label
          ? `x${t.quantity}`
          : `${t.quantity} ${t.unit_label}`;
        return `${t.name} ${unit}`;
      }
      return t.name;
    })
    .filter(Boolean);

  const details = [...customValues, ...toppingValues].join(', ');

  return details
    ? `  - (${details}) x${item.quantity}`
    : `  - x${item.quantity}`;
}

// ─────────────────────────────────────────────
// Spec: rendering_engine — Height Calculation
// ─────────────────────────────────────────────

/**
 * Dynamically calculates the required canvas height based on content.
 * Spec: "1. height_calculation: Dynamic calculation based on item count,
 *            customizations, and metadata."
 *
 * @param {Map<string, object[]>} groupedItems
 * @param {'INTERNAL'|'VOID'} variant
 * @param {boolean} isVoided
 * @returns {number} height in pixels
 */
function calculateReceiptHeight(groupedItems, variant, isVoided) {
  let h = PADDING_TOP;

  h += LINE_HEIGHT + 4; // Title line
  if (isVoided) h += LINE_HEIGHT; // "(Voided)" sub-title
  h += 4; // gap after title

  h += LINE_HEIGHT; // Order ID line
  h += LINE_HEIGHT; // Date line
  h += 6; // gap

  h += LINE_HEIGHT + 4; // "Items:" section label + gap

  for (const [, variants] of groupedItems) {
    h += LINE_HEIGHT; // parent header line (product name)
    h += variants.length * LINE_HEIGHT; // one sub-line per variant
  }

  h += 6; // gap before totals

  if (isVoided) {
    h += LINE_HEIGHT; // Reason
    h += LINE_HEIGHT; // Note
    h += 6; // gap
    h += LINE_HEIGHT; // Voided by
    h += LINE_HEIGHT; // Voided at
  } else {
    h += LINE_HEIGHT; // Payment Type
    h += LINE_HEIGHT + 2; // Total
  }

  h += 8; // gap before footer
  h += LINE_HEIGHT; // "Thank you!" or equivalent
  h += PADDING_BOTTOM;

  return Math.ceil(h);
}

// ─────────────────────────────────────────────
// Canvas Drawing Primitives
// ─────────────────────────────────────────────

function setFont(ctx, size, weight = 'normal') {
  ctx.font = `${weight} ${size}px "Khmer", Arial, sans-serif`;
}

function drawText(ctx, text, x, y, size = FONT_BODY, weight = 'normal') {
  setFont(ctx, size, weight);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  ctx.fillText(String(text), x, y);
}

function drawTextCentered(ctx, text, y, size = FONT_BODY, weight = 'normal') {
  setFont(ctx, size, weight);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  const measured = ctx.measureText(String(text));
  const x = Math.max(0, (FIXED_WIDTH - measured.width) / 2);
  ctx.fillText(String(text), x, y);
}

function drawTextRight(ctx, text, y, size = FONT_BODY, weight = 'normal') {
  setFont(ctx, size, weight);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  const measured = ctx.measureText(String(text));
  const x = FIXED_WIDTH - PADDING_X - measured.width;
  ctx.fillText(String(text), x, y);
}

function drawHorizontalLine(ctx, y) {
  ctx.beginPath();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.moveTo(PADDING_X, y);
  ctx.lineTo(FIXED_WIDTH - PADDING_X, y);
  ctx.stroke();
}

// ─────────────────────────────────────────────
// Spec: rendering_engine — Main Drawing
// ─────────────────────────────────────────────

/**
 * Renders the full receipt content onto the canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} order - Serialized order.
 * @param {Map<string, object[]>} groupedItems
 * @param {'INTERNAL'|'VOID'} variant
 * @param {object} l - Localization strings.
 * @returns {void}
 */
function drawReceiptContent(ctx, order, groupedItems, variant, l) {
  const isVoided = variant === 'VOID' || order.status === ORDER_STATUS.VOIDED;

  let y = PADDING_TOP;

  // ── Title ────────────────────────────────
  const titleText = isVoided
    ? `${l.title} (${l.status_voided || 'Voided'})`
    : l.title;
  drawTextCentered(ctx, titleText, y, FONT_TITLE, 'bold');
  y += LINE_HEIGHT + 4;

  // ── Order ID + Date ───────────────────────
  const orderIdLabel = (l.order_id?.split('{')?.[0] || 'Order ID').replace(/[\s:]+$/, '');
  drawText(ctx, `${orderIdLabel}: ${formatOrderId(order)}`, PADDING_X, y, FONT_BODY);
  y += LINE_HEIGHT;

  const dateLabel = isVoided
    ? (l.original_created_label || 'Created at')
    : 'Date';
  drawText(ctx, `${dateLabel}: ${formatDate(order.created_at)}`, PADDING_X, y, FONT_BODY);
  y += LINE_HEIGHT + 6;

  // ── "Items:" section header ───────────────
  drawText(ctx, `${l.items_header || 'Items'}:`, PADDING_X, y, FONT_BODY, 'bold');
  y += LINE_HEIGHT + 4;

  // ── Grouped Items per spec formatting_logic ───
  for (const [productName, variants] of groupedItems) {
    // Spec: "Parent Header: For each unique product name, print a header line
    //        (e.g., prefixed with '*')."
    drawText(ctx, `* ${productName}`, PADDING_X, y, FONT_BODY, 'bold');
    y += LINE_HEIGHT;

    for (const item of variants) {
      // Spec: "Variant Lines: For each instance under that name, print a sub-line
      //        (e.g., prefixed with '  -')."
      const variantLine = buildVariantLine(item);
      drawText(ctx, variantLine, PADDING_X, y, FONT_BODY);
      y += LINE_HEIGHT;
    }
  }

  y += 6;
  drawHorizontalLine(ctx, y);
  y += 4;

  // ── Totals / Void Metadata ─────────────────
  if (isVoided) {
    // Spec: "If order is VOID, display 'Reason' and 'Note' instead of 'Total' and 'Payment Type'."
    const reasonLabel = l.void_reason_label || 'Reason';
    const noteLabel = l.void_note_label || 'Note';
    const voidedByLabel = l.voided_by_label || 'Voided by';
    const voidedAtLabel = l.voided_at_label || 'Voided at';

    drawText(ctx, `${reasonLabel}: ${formatVoidReason(order.void_reason, l)}`, PADDING_X, y, FONT_BODY);
    y += LINE_HEIGHT;
    drawText(ctx, `${noteLabel}: ${order.void_note || '—'}`, PADDING_X, y, FONT_BODY);
    y += LINE_HEIGHT + 6;
    drawText(ctx, `${voidedByLabel}: ${order.voided_by_staff?.name || 'Unknown'}`, PADDING_X, y, FONT_BODY);
    y += LINE_HEIGHT;
    drawText(ctx, `${voidedAtLabel}: ${formatDate(order.voided_at)}`, PADDING_X, y, FONT_BODY);
    y += LINE_HEIGHT;
  } else {
    // Spec: "Product names are left-aligned; final prices are right-aligned."
    const paymentType = order.payments?.[0]?.payment_type || '—';
    drawText(ctx, `Payment Type: ${paymentType}`, PADDING_X, y, FONT_BODY);

    const totalLabel = l.total?.split('{')?.[0]?.replace(/[\s:]+$/, '') || 'Total';
    const totalValue = storeService.formatMoney(order.total_amount);
    // Right-align the total
    drawTextRight(ctx, `${totalLabel}: ${totalValue}`, y, FONT_TOTAL, 'bold');
    y += LINE_HEIGHT + 2;
  }

  y += 8;

  // ── Footer ─────────────────────────────────
  const thankYou = l.thank_you || 'Thank you!';
  drawTextCentered(ctx, thankYou, y, FONT_BODY);
}

// ─────────────────────────────────────────────
// Spec: rendering_engine — Rasterization
// ─────────────────────────────────────────────

/**
 * Converts a canvas to a 1-bit per pixel raster buffer.
 * Spec: "5. rasterization: Convert the multi-bit image into 1-bit black/white data for thermal heads."
 * Spec: "thresholding: Simple grayscale average with 128-level threshold for 1-bit conversion."
 *
 * Each byte in the returned buffer represents 8 horizontal dots (MSB = leftmost dot).
 *
 * @param {Canvas} canvas
 * @returns {Buffer}
 */
function canvasTo1bitRaster(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  const widthBytes = Math.ceil(width / 8);
  const rasterBuffer = Buffer.alloc(widthBytes * height, 0x00);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Standard grayscale luminance coefficients
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const isBlack = gray < GRAYSCALE_THRESHOLD;

      if (isBlack) {
        const byteIdx = y * widthBytes + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8); // MSB first
        rasterBuffer[byteIdx] |= 1 << bitIdx;
      }
    }
  }

  return rasterBuffer;
}

// ─────────────────────────────────────────────
// Spec: esc_pos_implementation
// ─────────────────────────────────────────────

/**
 * Assembles the final ESC/POS binary buffer.
 * Spec: "raster_command: GS v 0 (Raster bit image)."
 * Spec: "cut_command: GS V A 0 (Feed and full cut)."
 *
 * GS v 0 format:
 *   1D 76 30  m  xL  xH  yL  yH  [d1 ... dN]
 *   m = 0x00 (normal density)
 *   xL/xH = width in bytes (little-endian)
 *   yL/yH = height in dots (little-endian)
 *
 * @param {Buffer} rasterData - 1-bit packed raster data.
 * @param {number} widthPixels - Canvas width (should be FIXED_WIDTH = 576).
 * @param {number} heightDots - Canvas height in pixels/dots.
 * @returns {Buffer}
 */
function buildEscPosBuffer(rasterData, widthPixels, heightDots) {
  const widthBytes = Math.ceil(widthPixels / 8);

  const header = Buffer.allocUnsafe(8);
  // GS v 0 m
  ESC_POS_GS_V_0.copy(header, 0);
  // xL, xH (width in bytes, little-endian)
  header.writeUInt8(widthBytes & 0xff, 4);
  header.writeUInt8((widthBytes >> 8) & 0xff, 5);
  // yL, yH (height in dots, little-endian)
  header.writeUInt8(heightDots & 0xff, 6);
  header.writeUInt8((heightDots >> 8) & 0xff, 7);

  return Buffer.concat([header, rasterData, ESC_POS_CUT]);
}

// ─────────────────────────────────────────────
// Spec: rendering_engine — Public Entry Point
// ─────────────────────────────────────────────

/**
 * Renders a receipt for the given order and variant, returning a raw
 * ESC/POS binary buffer ready for direct USB transmission.
 *
 * Workflow (per spec rendering_engine):
 *  1. height_calculation
 *  2. canvas_creation
 *  3. drawing
 *  4. cropping (canvas is sized exactly to content — no extra whitespace)
 *  5. rasterization
 *
 * @param {object} order - Fully serialized order (from serializeOrder()).
 * @param {'INTERNAL'|'VOID'} [variant='INTERNAL']
 * @returns {Buffer} ESC/POS buffer (raster image + cut command).
 */
export function renderReceiptToEscPosBuffer(order, variant = 'INTERNAL') {
  ensureFont();

  const l = getLocalization();
  const isVoided = variant === 'VOID' || order.status === ORDER_STATUS.VOIDED;

  // Step 1 — Group items per spec: formatting_logic.grouping_strategy
  const groupedItems = groupItemsByName(order.items || []);

  // Step 2 — Dynamic height calculation
  const height = calculateReceiptHeight(groupedItems, variant, isVoided);

  logger.debug('Canvas receipt renderer: calculated height', {
    orderId: order.id,
    variant,
    canvasHeight: height,
    itemGroups: groupedItems.size,
  });

  // Step 3 — Create canvas (exact content size = built-in "cropping")
  const canvas = createCanvas(FIXED_WIDTH, height);
  const ctx = canvas.getContext('2d');

  // White background (thermal printers print black on white)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, FIXED_WIDTH, height);

  // Step 4 — Draw receipt content
  drawReceiptContent(ctx, order, groupedItems, variant, l);

  // Step 5 — Rasterize (multi-bit → 1-bit)
  const rasterData = canvasTo1bitRaster(canvas);

  // Build final ESC/POS buffer
  return buildEscPosBuffer(rasterData, FIXED_WIDTH, height);
}
