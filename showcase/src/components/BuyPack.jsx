import { useCallback, useEffect, useRef, useState } from 'react';
import { weavefox } from '../lib/weavefox.js';
import {
  RECORD_IMAGE,
  consult,
  create,
  describeError,
  getBuyerId,
  isDenied,
  isMobileViewport,
  listProducts,
  queryQuota,
  readOrder,
  saveOrder,
  shortId,
} from '../lib/vibe-pay-client.js';

const FALLBACK = {
  name: 'API Relay 调用次数包',
  billing: '按量计费 · 次数包',
  unit: '次',
};

function StateDot({ tone = 'idle' }) {
  const color =
    tone === 'ok' ? 'var(--signal)' : tone === 'warn' ? 'var(--amber)' : tone === 'bad' ? 'var(--alert)' : '#5a6b6f';
  return <span className="dot" style={{ color }} aria-hidden="true" />;
}

function Row({ label, children, strong = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--line-soft)] py-2.5 last:border-b-0">
      <span className="font-mono text-[10.5px] tracking-[0.1em] text-[var(--muted)]">{label}</span>
      <span className={`text-right font-mono text-[12px] ${strong ? 'text-[var(--text)]' : 'text-[#b9c9c4]'}`}>
        {children}
      </span>
    </div>
  );
}

export default function BuyPack() {
  const [boot, setBoot] = useState('loading');
  const [bootError, setBootError] = useState('');
  const [product, setProduct] = useState(null);
  const [quota, setQuota] = useState(null);
  const [quotaState, setQuotaState] = useState('idle');
  const [quotaError, setQuotaError] = useState('');
  const [stage, setStage] = useState('idle');
  const [purchase, setPurchase] = useState(null);
  const [notice, setNotice] = useState('');
  const [mobile, setMobile] = useState(isMobileViewport);

  const [buyerId] = useState(getBuyerId);
  const baseline = useRef(null);
  const pollTimer = useRef(null);
  const pollCount = useRef(0);

  useEffect(() => {
    const onResize = () => setMobile(isMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadQuota = useCallback(async (productId, { silent = false } = {}) => {
    if (!silent) setQuotaState('loading');
    try {
      const q = await queryQuota(weavefox.vibePay, productId, buyerId);
      setQuota(q);
      setQuotaState('ok');
      setQuotaError('');
      return q;
    } catch (error) {
      const info = describeError(error);
      setQuotaState(info.kind === 'not-enabled' ? 'unavailable' : 'error');
      setQuotaError(info.text);
      return null;
    }
  }, [buyerId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const products = await listProducts(weavefox.vibePay);
        if (!alive) return;
        const first = products[0] ?? null;
        setProduct(first);
        if (!first) {
          setBoot('unavailable');
          setBootError('商品已创建但还没有可售档位，等待配置完成。');
          setQuotaState('unavailable');
          return;
        }
        setBoot('ready');
        if (first.status && first.status !== 'ENABLED') {
          setBootError(first.reason || `商品状态：${first.status}`);
        }
        void loadQuota(first.id);
      } catch (error) {
        if (!alive) return;
        const info = describeError(error);
        setBoot(info.kind === 'not-enabled' ? 'unavailable' : 'error');
        setBootError(info.text);
        setQuotaState(info.kind === 'not-enabled' ? 'unavailable' : 'error');
        setQuotaError(info.text);
      }
    })();

    return () => {
      alive = false;
    };
  }, [loadQuota]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const confirmPayment = useCallback(
    async (productId) => {
      try {
        // 到账以查询余额为准；quota/refresh 是核销确认接口，未消费时必然返回 NOT_FOUND，不能用来判断付款。
        const q = await queryQuota(weavefox.vibePay, productId, buyerId);
        if (!q) return false;
        setQuota(q);
        setQuotaState('ok');
        const before = baseline.current;
        const arrived = q.remaining === null ? false : before === null ? q.remaining > 0 : q.remaining > before;
        if (arrived) {
          stopPolling();
          // 到账后释放旧单号，下一次购买使用新的 outRequestNo，避免幂等复用已支付订单。
          saveOrder(productId, { outRequestNo: '', createdAt: Date.now() });
          setStage('done');
          setNotice('到账已确认，余额已刷新。');
          return true;
        }
        return false;
      } catch (error) {
        const info = describeError(error);
        setQuotaError(info.text);
        return false;
      }
    },
    [buyerId, stopPolling]
  );

  const startPolling = useCallback(
    (productId) => {
      stopPolling();
      pollCount.current = 0;
      pollTimer.current = window.setInterval(async () => {
        pollCount.current += 1;
        if (pollCount.current > 36) {
          stopPolling();
          setStage('waiting');
          setNotice('等待超过 3 分钟。若已付款，请点「我已完成支付」手动确认。');
          return;
        }
        const ok = await confirmPayment(productId);
        if (!ok) setNotice(`等待支付到账…（已查询 ${pollCount.current} 次）`);
      }, 5000);
    },
    [confirmPayment, stopPolling]
  );

  const buy = async (forceNew = false) => {
    if (!product) return;
    setNotice('');
    setStage(product.billingMode === 'QUANTITY' ? 'creating' : 'consulting');
    try {
      const before = quota?.remaining ?? null;
      baseline.current = before;

      // 次数包（QUANTITY）不支持 consultPurchase，直接下单；买断/时长包才需要询价。
      if (product.billingMode !== 'QUANTITY') {
        const advised = await consult(weavefox.vibePay, product.id, buyerId);
        if (advised.decision && isDenied(advised.decision)) {
          setStage('error');
          setNotice(advised.message || `当前不可购买（${advised.decision}）。`);
          return;
        }
      }

      setStage('creating');
      const cached = forceNew ? null : readOrder(product.id);
      // 支付链接约 30 分钟过期：只复用 25 分钟内的单号，避免拿过期订单反复失败。
      const freshCached = cached?.outRequestNo && Date.now() - (cached.createdAt || 0) < 25 * 60 * 1000;
      let orderNo = freshCached ? cached.outRequestNo : weavefox.vibePay.createRequestNo('relay');
      saveOrder(product.id, { outRequestNo: orderNo, createdAt: freshCached ? cached.createdAt : Date.now() });

      let order;
      try {
        order = await create(weavefox.vibePay, product.id, buyerId, orderNo);
      } catch (error) {
        // 旧订单过期后换新单号重试一次；其他错误原样抛出，不做模糊重试。
        if (!/过期|逾期|expire/i.test(String(error?.message || ''))) throw error;
        orderNo = weavefox.vibePay.createRequestNo('relay');
        saveOrder(product.id, { outRequestNo: orderNo, createdAt: Date.now() });
        order = await create(weavefox.vibePay, product.id, buyerId, orderNo);
      }
      setPurchase({ ...order, outRequestNo: orderNo });

      if (!order.qrCode && !order.payUrl) {
        // 没有支付入口，可能是直接到账或需要人工介入
        const ok = await confirmPayment(product.id);
        if (!ok) {
          setStage('error');
          setNotice(order.message || '下单成功但没有返回支付入口，请稍后刷新权益。');
        }
        return;
      }

      setStage('waiting');
      setNotice(mobile ? '已生成支付链接，点击下方按钮在支付宝中完成付款。' : '请用支付宝扫一扫下方二维码完成付款。');
      startPolling(product.id, orderNo);
    } catch (error) {
      const info = describeError(error);
      setStage('error');
      setNotice(info.text);
    }
  };

  const manualConfirm = async () => {
    if (!product) return;
    setStage('confirming');
    setNotice('正在向服务端确认支付结果…');
    const ok = await confirmPayment(product.id);
    if (!ok) {
      setStage('waiting');
      setNotice('服务端还没有查到这笔支付。付款成功通常需要几秒，请稍后再试。');
    }
  };

  const refreshRights = () => {
    if (product) void loadQuota(product.id);
  };

  const status = boot === 'ready' ? product?.status || '' : '';
  const sellable = boot === 'ready' && (!status || status === 'ENABLED');
  const remaining = quota?.remaining;
  const option = product?.options?.[0] ?? null;

  return (
    <section id="buy" className="section section-rule">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="section-num">04 / BUY A PACK</div>
            <h2 className="section-title mt-4">
              先买一包，
              <br />
              再让 Agent 跑。
            </h2>
          </div>
          <p className="lede max-w-[440px]">
            这一块是真实收款，不是演示：订单由 Vibe Pay 生成，付款进入商家绑定的支付宝账户。
            买到的次数记在这个浏览器身份下，页面刷新也不会丢。
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
          {/* 购买面板 */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <StateDot tone={sellable ? 'ok' : boot === 'loading' ? 'warn' : 'warn'} />
                <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--text)]">
                  {boot === 'loading'
                    ? '正在读取商品'
                    : sellable
                      ? '可购买 · VIBE PAY'
                      : '暂不可购买'}
                </span>
              </div>
              <span className="font-mono text-[9.5px] tracking-[0.12em] text-[#5a6b6f]">
                {status ||
                  (boot === 'unavailable' ? 'NOT ENABLED' : boot === 'error' ? 'ERROR' : boot === 'ready' ? 'ENABLED' : '—')}
              </span>
            </div>

            <div className="px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-mono text-[9.5px] tracking-[0.16em] text-[var(--muted)]">PRODUCT</div>
                  <div className="mt-1.5 text-[17px] font-bold tracking-tight sm:text-[19px]">
                    {product?.name || FALLBACK.name}
                  </div>
                  <div className="mt-1 font-mono text-[10.5px] text-[#5a6b6f]">
                    {FALLBACK.billing} · {option?.quota ? `${option.quota} ${FALLBACK.unit}` : '档位以服务端为准'}
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="font-mono text-[9.5px] tracking-[0.16em] text-[var(--muted)]">PRICE</div>
                  <div
                    className={`display mt-1 whitespace-nowrap leading-none text-[var(--signal)] ${
                      option?.priceText ? 'text-[30px]' : 'text-[14px] text-[var(--muted)]'
                    }`}
                  >
                    {option?.priceText || '待配置'}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <Row label="计费模式">QUANTITY · COUNT</Row>
                <Row label="支付通道">支付宝 Vibe Pay</Row>
                <Row label="到账位置">商家支付宝余额</Row>
                <Row label="买家身份" strong>
                  <span title={buyerId}>{shortId(buyerId)}</span>
                </Row>
              </div>

              {boot === 'loading' && (
                <p className="mt-5 font-mono text-[11px] leading-relaxed text-[var(--muted)]" aria-live="polite">
                  › 正在建立运行时会话并读取商品…
                </p>
              )}

              {boot !== 'loading' && !sellable && (
                <div className="mt-5 border border-[#3b2f18] bg-[#141006] px-4 py-3" aria-live="polite">
                  <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-[var(--amber)]">
                    <StateDot tone="warn" /> {boot === 'error' ? '服务暂时不可用' : '商品配置中'}
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#c9b98f]">
                    {bootError || '商品已创建，等待商户绑定与价格配置完成后再开放购买。'}
                    此时页面不会生成订单，也不会产生任何扣款。
                  </p>
                </div>
              )}

              {sellable && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => buy(stage === 'waiting')}
                    className="btn btn-primary w-full"
                    disabled={stage === 'consulting' || stage === 'creating' || stage === 'confirming'}
                  >
                    {stage === 'consulting' && '正在向服务端询价…'}
                    {stage === 'creating' && '正在创建订单…'}
                    {stage === 'confirming' && '正在确认支付…'}
                    {(stage === 'idle' || stage === 'error' || stage === 'done' || stage === 'waiting') &&
                      (stage === 'waiting' ? '重新发起购买' : '购买次数包')}
                    <span aria-hidden="true">→</span>
                  </button>

                  {stage === 'waiting' && purchase && (
                    <div className="mt-5 border border-[var(--line)] bg-[#0a0f12] p-4" aria-live="polite">
                      {purchase.qrCode && !mobile && (
                        <div className="flex flex-col items-center">
                          <img
                            src={purchase.qrCode}
                            alt="支付宝支付二维码"
                            className="h-[188px] w-[188px] bg-white p-2"
                            loading="lazy"
                          />
                          <p className="mt-3 font-mono text-[10px] tracking-[0.1em] text-[var(--muted)]">
                            支付宝扫一扫 · 完成付款
                          </p>
                        </div>
                      )}

                      {mobile && purchase.payUrl && (
                        <a
                          href={purchase.payUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary w-full"
                        >
                          在支付宝中打开支付页
                          <span aria-hidden="true">↗</span>
                        </a>
                      )}

                      {!purchase.payUrl && purchase.qrCode && mobile && (
                        <p className="font-mono text-[11px] leading-relaxed text-[var(--muted)]">
                          当前设备请用支付宝扫描桌面端二维码，或在支付宝内重新打开本页。
                        </p>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-3">
                        <span className="font-mono text-[9.5px] tracking-[0.06em] text-[#5a6b6f]">
                          单号 {shortId(purchase.outRequestNo)}
                        </span>
                        <button
                          type="button"
                          onClick={manualConfirm}
                          className="font-mono text-[10.5px] text-[var(--signal)] underline decoration-dotted underline-offset-4"
                        >
                          我已完成支付
                        </button>
                      </div>
                    </div>
                  )}

                  {notice && (
                    <p
                      className={`mt-4 border-l-2 pl-3 font-mono text-[11px] leading-relaxed ${
                        stage === 'error'
                          ? 'border-[var(--alert)] text-[#e6a196]'
                          : stage === 'done'
                            ? 'border-[var(--signal)] text-[#a8e6d0]'
                            : 'border-[var(--amber)] text-[#cfb785]'
                      }`}
                      aria-live="polite"
                    >
                      {notice}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--line-soft)] bg-[#0a0f12] px-6 py-3">
              <p className="font-mono text-[9.5px] leading-relaxed tracking-[0.04em] text-[#4d5f63]">
                真实扣款由支付宝完成；页面不接触银行卡信息，也不会代替用户确认支付。
              </p>
            </div>
          </div>

          {/* 权益票据 */}
          <div className="grid gap-5">
            <div className="ticket p-6">
              <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.16em] text-[var(--paper-muted)]">
                <span>AI USAGE VOUCHER</span>
                <span>LIVE BALANCE</span>
              </div>
              <div className="ticket-dash my-4" />

              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[9px] tracking-[0.16em] text-[var(--paper-muted)]">
                    剩余次数 / REMAINING
                  </div>
                  <div
                    className={`display mt-1 leading-none text-[var(--paper-text)] ${
                      quotaState === 'ok' && remaining !== null ? 'text-[56px]' : 'text-[30px] text-[#8b8a7f]'
                    }`}
                  >
                    {quotaState === 'ok' && remaining !== null
                      ? remaining
                      : quotaState === 'loading'
                        ? '··'
                        : quotaState === 'unavailable'
                          ? '未开通'
                          : quotaState === 'error'
                            ? '查询失败'
                            : '—'}
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] leading-relaxed text-[#5c5b53]">
                  {quotaState === 'ok' && (
                    <>
                      {quota?.total !== null && quota?.total !== undefined ? `累计 ${quota.total} 次` : '按服务端返回'}
                      <br />
                      {quota?.used !== null && quota?.used !== undefined ? `已用 ${quota.used} 次` : ''}
                    </>
                  )}
                </div>
              </div>

              <div className="ticket-dash my-4" />

              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-[9.5px] leading-relaxed text-[#5c5b53]">
                  {quotaState === 'ok' && '权益已同步到当前浏览器身份'}
                  {quotaState === 'loading' && '正在查询权益…'}
                  {quotaState === 'unavailable' && '服务未开通，暂不可查询'}
                  {quotaState === 'error' && (quotaError || '权益查询失败')}
                </div>
                <button
                  type="button"
                  onClick={refreshRights}
                  className="btn h-9 min-h-0 border border-[#b9b1a0] px-3 text-[10.5px] text-[#191b18] hover:border-[#191b18]"
                  disabled={quotaState === 'loading'}
                >
                  刷新
                </button>
              </div>

              <div className="barcode mt-4 opacity-60" aria-hidden="true" />
            </div>

            <div className="card flex items-center gap-4 p-4">
              <img
                src={RECORD_IMAGE}
                alt="购买记录二维码"
                className="h-[92px] w-[92px] flex-none bg-white object-contain p-1"
                loading="lazy"
              />
              <div>
                <div className="font-mono text-[9.5px] tracking-[0.14em] text-[var(--signal)]">购买记录</div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted)]">
                  用支付宝扫一扫查看历史订单与支付结果。页面不缓存订单金额，以服务端为准。
                </p>
              </div>
            </div>

            <p className="font-mono text-[9.5px] leading-relaxed text-[#4d5f63]">
              匿名身份只在当前浏览器有效；换设备或清空本地存储后，历史权益需要用同一账号体系找回。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}