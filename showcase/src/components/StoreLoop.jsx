import { useMemo, useState } from 'react';

const CASES = [
  {
    merchant: '城南咖啡 · 湖滨店',
    pack: '标准对话 100 次',
    code: 'K7QF-2M9X',
    total: 100,
    used: 87,
    expires: '2026-12-31',
    price: '¥9.90',
    scene: '桌贴',
  },
  {
    merchant: '深夜面馆 · 外卖档',
    pack: '外卖单码 50 次',
    code: 'B3HD-8WQ4',
    total: 50,
    used: 50,
    expires: '2027-01-15',
    price: '¥19.90',
    scene: '58mm 标签',
  },
  {
    merchant: '社区烘焙 · 三号店',
    pack: '混合对话 + 画图 200 次',
    code: 'R9TC-5JNE',
    total: 200,
    used: 12,
    expires: '2027-03-09',
    price: '¥29.90',
    scene: '桌贴',
  },
];

function QrPattern({ seed }) {
  const cells = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 2147483647;
    const out = [];
    for (let y = 0; y < 15; y += 1) {
      for (let x = 0; x < 15; x += 1) {
        h = (h * 1103515245 + 12345) % 2147483647;
        const corner = (x < 4 && y < 4) || (x > 10 && y < 4) || (x < 4 && y > 10);
        out.push(corner ? (x === 0 || y === 0 || x === 3 || y === 3 || (x === 1 && y === 1)) : h % 100 > 52);
      }
    }
    return out;
  }, [seed]);

  return (
    <div
      className="grid grid-cols-[repeat(15,1fr)] gap-px border border-[#191b18] bg-[var(--paper)] p-1.5"
      style={{ width: 84, height: 84 }}
      aria-hidden="true"
    >
      {cells.map((on, i) => (
        <span key={i} style={{ background: on ? '#191b18' : 'transparent' }} />
      ))}
    </div>
  );
}

export default function StoreLoop() {
  const [active, setActive] = useState(0);
  const [usedMap, setUsedMap] = useState(() => CASES.map((c) => c.used));

  const current = CASES[active];
  const used = usedMap[active];
  const remaining = Math.max(0, current.total - used);
  const exhausted = remaining === 0;

  const scan = () => {
    if (exhausted) return;
    setUsedMap((prev) => prev.map((v, i) => (i === active ? Math.min(current.total, v + 1) : v)));
  };

  const reset = () => {
    setUsedMap((prev) => prev.map((v, i) => (i === active ? current.used : v)));
  };

  const filled = Math.round((remaining / current.total) * 20);

  return (
    <section id="store" className="section section-rule">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="section-num">05 / STORE LOOP</div>
            <h2 className="section-title mt-4">一张码，<br className="hidden sm:block" />把 AI 卖到街边。</h2>
          </div>
          <p className="lede max-w-[430px]">
            不改变商家的收款习惯，也不碰餐费。只把「AI 次数」做成可打印、可核销、
            可撤销的实体凭证。下面这张票据可以点。
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          {/* 票据 */}
          <div className="lg:sticky lg:top-24">
            <div className="mb-4 flex flex-wrap gap-2">
              {CASES.map((c, i) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setActive(i)}
                  className="tab-btn"
                  data-active={i === active}
                  aria-pressed={i === active}
                >
                  {c.merchant.split(' · ')[0]}
                </button>
              ))}
            </div>

            <div
              className="ticket mx-auto max-w-[420px] p-6 transition-opacity"
              style={{ opacity: exhausted ? 0.86 : 1 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[9px] tracking-[0.2em] text-[var(--paper-muted)]">
                    AI USAGE VOUCHER
                  </div>
                  <div className="mt-2 font-medium text-[17px]">{current.merchant}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-[#5c5b53]">{current.pack}</div>
                </div>
                <div className="text-right font-mono text-[9px] leading-relaxed text-[var(--paper-muted)]">
                  {current.scene}
                  <br />
                  {current.price}
                </div>
              </div>

              <div className="ticket-dash my-4" />

              <div className="flex items-center gap-4">
                <QrPattern seed={current.code + active} />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[9px] tracking-[0.16em] text-[var(--paper-muted)]">
                    核销码 / CODE
                  </div>
                  <div className="mt-1 font-mono text-[19px] font-bold tracking-[0.08em]">
                    {current.code}
                  </div>
                  <div className="mt-2 font-mono text-[9.5px] leading-relaxed text-[#5c5b53]">
                    扫码进入 H5 · 无需注册
                    <br />
                    到期 {current.expires}
                  </div>
                </div>
              </div>

              <div className="ticket-dash my-4" />

              <div className="flex items-end justify-between">
                <div>
                  <div className="font-mono text-[9px] tracking-[0.16em] text-[var(--paper-muted)]">
                    剩余次数 / REMAINING
                  </div>
                  <div className="display mt-1 text-[46px] leading-none">{remaining}</div>
                </div>
                <div className="text-right font-mono text-[10px] text-[#5c5b53]">
                  已用 {used} / {current.total}
                </div>
              </div>

              <div className="use-pips mt-4" aria-hidden="true">
                {Array.from({ length: 20 }).map((_, i) => (
                  <span
                    key={i}
                    className={`use-pip ${i < filled ? 'used' : 'spent'}`}
                    style={{ opacity: i < filled ? 1 : 0.5 }}
                  />
                ))}
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={scan}
                  className="btn btn-primary h-10 min-h-0 flex-1 text-[11.5px]"
                  disabled={exhausted}
                >
                  {exhausted ? '次数已用尽' : '模拟顾客扫码一次'}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="btn h-10 min-h-0 border border-[#b9b1a0] px-3 text-[11px] text-[#191b18] hover:border-[#191b18]"
                >
                  重置
                </button>
              </div>

              {exhausted && (
                <div className="mt-4 border border-[#c0492f] bg-[#f7e6e0] px-3 py-2.5 font-mono text-[10.5px] leading-relaxed text-[#8f2f1a]">
                  ⚠ 该码已归零：顾客端提示「请联系商家续购」。商家控制台再买一包，
                  新码立即生效，旧码保留核销记录。
                </div>
              )}

              <div className="barcode mt-5 opacity-70" aria-hidden="true" />
              <div className="mt-2 flex items-center justify-between font-mono text-[8.5px] tracking-[0.14em] text-[var(--paper-muted)]">
                <span>SHARED BY THE TABLE</span>
                <span>NO CASH · NO SIGNUP</span>
              </div>
            </div>

            <p className="mt-4 text-center font-mono text-[9.5px] leading-relaxed text-[#4d5f63]">
              票据为展示站模拟数据；实际二维码由服务端 /biz/qr/:code.svg 生成
            </p>
          </div>

          {/* 说明 */}
          <div className="grid gap-px sm:grid-cols-2">
            {[
              {
                t: '同码共享，成功才扣',
                d: '同一桌多人扫同一张码，共用剩余次数；只有上游成功返回才扣 1 次，失败、被拦截、流中途断开都不计次。',
                tag: 'uses gate',
              },
              {
                t: '外卖单号幂等绑定',
                d: '同一商家重复录入同一单号，返回原码且不消耗码池。58mm × 40mm 热敏标签含单号、二维码与到期日。',
                tag: 'idempotent',
              },
              {
                t: '商家之间硬隔离',
                d: '商家令牌只能看到自己的订单、码与营收；停用后令牌立即失效，历史数据保留。交叉访问被服务端拒绝。',
                tag: 'scoped token',
              },
              {
                t: '支付与出码解耦',
                d: '支付通知验签、核对 app_id 与金额后条件更新订单；重复通知不会重复出码。mock 与支付宝共用同一套状态机。',
                tag: 'state machine',
              },
            ].map((item) => (
              <article key={item.t} className="card card-hover p-6">
                <div className="font-mono text-[9.5px] tracking-[0.14em] text-[var(--signal)]">
                  {item.tag}
                </div>
                <h3 className="mt-3 text-[17px] font-bold tracking-tight">{item.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{item.d}</p>
              </article>
            ))}

            <div className="card p-6 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[9.5px] tracking-[0.14em] text-[var(--muted)]">
                    MEASURED FLOW
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">
                    仓库验收口径：浏览器完成「下单 → 支付 → 出码 → 扫码 → 对话/画图 →
                    次数归零 → 续购提示」，并留存截图与页面读数。
                  </p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <div className="display text-[26px] leading-none">7</div>
                    <div className="mt-1 font-mono text-[9px] tracking-[0.12em] text-[var(--muted)]">
                      闭环步骤
                    </div>
                  </div>
                  <div>
                    <div className="display text-[26px] leading-none">0</div>
                    <div className="mt-1 font-mono text-[9px] tracking-[0.12em] text-[var(--muted)]">
                      外部凭据依赖
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}