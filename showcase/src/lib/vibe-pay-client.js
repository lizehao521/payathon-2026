// Vibe Pay 前端适配层
// 服务端字段以实际返回为准：这里做多字段容错，避免命名差异导致白屏。
// 不放任何商户配置入口、管理令牌或密钥。

const BUYER_KEY = 'relay.vibepay.buyer';
const ORDER_KEY = 'relay.vibepay.order';

export const RECORD_IMAGE =
  'https://mdn.alipayobjects.com/huamei_4qpv3u/afts/img/a-cVSqxWPZgAAAAAQFAAAAgAeocTAQFr/original';

export function getBuyerId() {
  if (typeof window === 'undefined') return 'buyer-server';
  try {
    const saved = window.localStorage.getItem(BUYER_KEY);
    if (saved) return saved;
    const id =
      'buyer-' + (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    window.localStorage.setItem(BUYER_KEY, id);
    return id;
  } catch {
    return 'buyer-' + Date.now();
  }
}

export function shortId(value) {
  const text = String(value ?? '');
  if (text.length <= 18) return text;
  return `${text.slice(0, 8)}…${text.slice(-6)}`;
}

export function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator?.userAgent || '';
  // 只用 UA 判断：桌面（含窄窗口、带触屏的 Windows）没有支付宝 App，应展示二维码；
  // 触屏小屏但 UA 是桌面时也给二维码，避免无法付款的死路。
  return /Android|iPhone|iPad|iPod|Mobile|AlipayClient/i.test(ua);
}

/* ---------------- 订单号持久化：重试复用，避免重复扣款 ---------------- */

export function readOrder(productId) {
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map?.[productId] ?? null;
  } catch {
    return null;
  }
}

export function saveOrder(productId, order) {
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[productId] = order;
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(map));
  } catch {
    /* 忽略写入失败，内存态仍可继续 */
  }
}

/* ---------------- 字段归一化 ---------------- */

function pick(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return undefined;
}

/** 价格可能是分、元或已格式化字符串；只做保守推断，拿不准就原样展示。 */
export function formatPrice(source, value) {
  const explicit = pick(source, ['priceText', 'priceLabel', 'formattedPrice']);
  if (typeof explicit === 'string') return explicit;
  const fen = pick(source, ['priceFen', 'priceInFen', 'amountFen', 'priceCent']);
  if (fen !== undefined && Number.isFinite(Number(fen))) return `¥${(Number(fen) / 100).toFixed(2)}`;
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string' && /[¥￥]/.test(value)) return value;
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  // 整数且大于 100 更可能是分（如 990 → ¥9.90）
  if (Number.isInteger(num) && num >= 100) return `¥${(num / 100).toFixed(2)}`;
  return `¥${num.toFixed(2)}`;
}

function normalizeOption(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const priceValue = pick(raw, ['price', 'salePrice', 'amount', 'payAmount', 'priceValue']);
  const quota = pick(raw, ['quota', 'quotaCount', 'quotaAmount', 'count', 'num', 'times']);
  return {
    id: pick(raw, ['optionId', 'chargeOptionId', 'skuId', 'outOptionId', 'id']),
    raw,
    name: pick(raw, ['optionName', 'name', 'title', 'desc']) || '',
    priceText: formatPrice(raw, priceValue),
    quota: quota === undefined ? null : Number(quota),
    quotaUnit: pick(raw, ['quotaUnit', 'unit']) || 'COUNT',
  };
}

export function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = pick(raw, ['outProductId', 'productId', 'id']);
  if (!id) return null;
  const optionsRaw = pick(raw, ['chargingOptions', 'options', 'pricingOptions', 'skus', 'chargeOptions']);
  const options = Array.isArray(optionsRaw) ? optionsRaw.map(normalizeOption).filter(Boolean) : [];
  return {
    id: String(id),
    raw,
    name: pick(raw, ['productName', 'name', 'title']) || '未命名商品',
    status: String(pick(raw, ['capabilityStatus', 'status', 'productStatus', 'state']) || ''),
    reason: pick(raw, ['reasonMessage', 'reason', 'message']) || '',
    billingMode: String(pick(raw, ['billingMode', 'pricingMode']) || ''),
    quotaUnit: String(pick(raw, ['quotaUnit']) || 'COUNT'),
    options,
  };
}

export function normalizeProducts(raw) {
  const holder = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
  const list = Array.isArray(raw)
    ? raw
    : pick(holder, ['products', 'list', 'records', 'items', 'data']);
  if (Array.isArray(list)) return list.map(normalizeProduct).filter(Boolean);
  const single = normalizeProduct(holder?.product ?? holder);
  return single ? [single] : [];
}

export function normalizeQuota(raw) {
  const holder = raw && typeof raw === 'object' ? raw : {};
  const source = holder.quota && typeof holder.quota === 'object' ? holder.quota : holder;
  const remaining = pick(source, [
    'remaining',
    'remainingQuota',
    'quota',
    'balance',
    'available',
    'left',
    'surplus',
    'quotaBalance',
  ]);
  const total = pick(source, ['total', 'totalQuota', 'quotaTotal', 'amount', 'purchased']);
  const used = pick(source, ['used', 'usedQuota', 'consumed']);
  const toNum = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
  return {
    raw,
    remaining: toNum(remaining),
    total: toNum(total),
    used: toNum(used),
    unit: pick(source, ['quotaUnit', 'unit']) || 'COUNT',
  };
}

export function normalizePurchase(raw) {
  const holder = raw && typeof raw === 'object' ? raw : {};
  return {
    raw,
    qrCode: pick(holder, ['purchaseQrCode', 'qrCodeUrl', 'qrCode', 'codeUrl', 'payQrCode']),
    payUrl: pick(holder, ['purchaseUrl', 'payUrl', 'cashierUrl', 'redirectUrl']),
    orderNo: pick(holder, ['outRequestNo', 'requestNo', 'orderNo', 'tradeNo']),
    decision: String(pick(holder, ['decision', 'result', 'action']) || ''),
    status: String(pick(holder, ['status', 'orderStatus', 'tradeStatus', 'consumeStatus']) || ''),
    message: pick(holder, ['message', 'reasonMessage', 'desc']) || '',
  };
}

/* ---------------- 请求封装：服务端是严格 schema，多余字段会被 400 拒绝 ---------------- */
// 实测字段：quota/query = { outProductId, buyerId }
//           purchase/create = { outProductId, buyerId, outRequestNo }
//           quota/refresh = { outProductId, buyerId, outRequestNo }
//           purchase/consult = { outProductId, buyerId }（仅适用于买断/时长包）

export async function listProducts(vibePay) {
  const data = await vibePay.listProducts();
  return normalizeProducts(data);
}

export async function consult(vibePay, productId, buyerId) {
  const data = await vibePay.consultPurchase({ outProductId: productId, buyerId });
  return normalizePurchase(data);
}

export async function create(vibePay, productId, buyerId, outRequestNo) {
  const data = await vibePay.createPurchase({ outProductId: productId, buyerId, outRequestNo });
  return normalizePurchase(data);
}

export async function queryQuota(vibePay, productId, buyerId) {
  const data = await vibePay.queryQuota({ outProductId: productId, buyerId });
  return normalizeQuota(data);
}

export async function refreshQuota(vibePay, productId, buyerId, outRequestNo) {
  const body = { outProductId: productId, buyerId };
  if (outRequestNo) body.outRequestNo = outRequestNo;
  const data = await vibePay.refreshQuota(body);
  return normalizeQuota(data);
}

const DENY_WORDS = ['DENY', 'DENIED', 'NOT_ALLOWED', 'FORBIDDEN', 'ALREADY', 'SUFFICIENT', 'LIMIT'];

export function isDenied(decision) {
  const text = String(decision || '').toUpperCase();
  if (!text) return false;
  return DENY_WORDS.some((word) => text.includes(word));
}

/** 把服务端错误翻译成页面能说人话的状态。 */
export function describeError(error) {
  const status = error?.status;
  const message = String(error?.message || '');
  if (status === 401 || /not enabled|未开通|unauthorized/i.test(message)) {
    return { kind: 'not-enabled', text: 'Vibe Pay 尚未对该应用开放：商品已创建，等待商户绑定与价格配置完成。' };
  }
  if (status === 403) {
    return { kind: 'denied', text: '当前应用没有该商品的收款授权，需要先在 WeaveFox 侧绑定商品。' };
  }
  if (status === 404) {
    return { kind: 'missing', text: '没有查到可售商品，可能还在配置中。' };
  }
  return { kind: 'error', text: message || '服务暂时不可用，请稍后重试。' };
}