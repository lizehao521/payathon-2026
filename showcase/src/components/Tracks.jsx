import { scrollToSection } from '../lib/scrollToSection.js';

const AGENT_FLOW = [
  { k: '01', t: '无凭证请求', d: 'Agent 直接调用 /agent/v1/chat/completions，不带任何注册与月费。' },
  { k: '02', t: '402 + 支付链接', d: '响应头返回 amtPaymentLink，响应体带金额、订单号与支付截止时间。' },
  { k: '03', t: '用户确认支付', d: '走支付宝 AI 付，服务端 RSA2 验签、核对金额与交易状态。' },
  { k: '04', t: '凭证重试交付', d: '带 Payment-Proof 重试；同一交易号只履约一次，上游失败可原凭证重试。' },
];

const STORE_FLOW = [
  { k: '01', t: '商家买次数包', d: '套餐含次数、价格、可用模型与有效期，mock / 支付宝当面付两条通道。' },
  { k: '02', t: '支付成功出码', d: '按购买数量生成 XXXX-XXXX 核销码，可打印桌贴或 58mm 外卖标签。' },
  { k: '03', t: '顾客扫码即用', d: '不下载、不注册；同一张码可多人共享，发话与画图共用次数。' },
  { k: '04', t: '成功才扣次', d: '失败、被拦截、流中断都不计次；归零后提示商家续购。' },
];

export default function Tracks() {
  return (
    <section id="tracks" className="section section-rule">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="section-num">02 / TWO TRACKS</div>
            <h2 className="section-title mt-4">两条赛道，<br />同一个计量内核。</h2>
          </div>
          <p className="lede max-w-[420px]">
            对外是两种客户：会自己调接口的 Agent，和只想贴一张码的店主。
            对内是同一套订单、次数闸门与幂等履约，不维护两套账。
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Machine Pay */}
          <article className="card relative overflow-hidden p-7 md:p-9">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 glow-signal opacity-60" />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="chip border-[#1f4a3c] text-[var(--signal)]">
                  <span className="dot dot-live" /> 特殊赛道
                </span>
                <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--muted)]">
                  MACHINE PAY
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#5a6b6f]">HTTP 402</span>
            </div>

            <h3 className="display relative mt-6 text-[clamp(26px,3.2vw,38px)]">
              让 Agent 按次付费，
              <br />
              不办卡、不注册。
            </h3>
            <p className="lede relative mt-4 max-w-[520px] text-[15.5px]">
              模型 API 聚合网关，OpenAI 兼容。没付钱时返回的不是一句冷冰冰的
              <span className="mono text-[var(--amber)]"> 402 </span>
              ，而是一张可直接支付的
              <span className="mono text-[var(--text)]"> amtPaymentLink </span>
              ；付完凭
              <span className="mono text-[var(--text)]"> Payment-Proof </span>
              重试，响应逐字节透传。
            </p>

            <ol className="relative mt-8 grid gap-px sm:grid-cols-2">
              {AGENT_FLOW.map((s) => (
                <li key={s.k} className="border-t border-[var(--line)] py-4 pr-4">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] text-[var(--signal)]">{s.k}</span>
                    <span className="font-medium">{s.t}</span>
                  </div>
                  <p className="mt-1.5 pl-[26px] text-[13px] leading-relaxed text-[var(--muted)]">
                    {s.d}
                  </p>
                </li>
              ))}
            </ol>

            <div className="relative mt-6 flex flex-wrap gap-2">
              {['支付宝 AI 付', '凭证幂等', '原凭证重试', '402 预下单复用'].map((tag) => (
                <span className="chip" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </article>

          {/* Vibe Pay */}
          <article className="ticket relative p-7 md:p-8">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.14em] text-[var(--paper-muted)]">
              <span>主赛道 · VIBE PAY</span>
              <span>NO. 0001</span>
            </div>
            <div className="ticket-dash my-4" />
            <h3 className="display text-[clamp(24px,2.8vw,32px)] text-[var(--paper-text)]">
              把 AI 卖成
              <br />
              一张桌贴。
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-[#4c4b44]">
              商家买次数包，系统出码；顾客扫码就能问、能画。不碰餐费，不抽交易流水，
              只卖 AI 次数——包价与上游成本之间留毛利。
            </p>

            <ul className="mt-6 space-y-3 font-mono text-[11.5px] text-[var(--paper-text)]">
              {['买包 → 支付 → 出码', '打印桌贴 / 外卖标签', '扫码即用，无需注册', '成功一次扣一次'].map(
                (line, i) => (
                  <li key={line} className="flex items-center gap-3">
                    <span className="grid h-4 w-4 place-items-center border border-[#b9b1a0] text-[9px]">
                      {i + 1}
                    </span>
                    {line}
                  </li>
                )
              )}
            </ul>

            <div className="ticket-dash my-5" />
            <div className="flex items-end justify-between">
              <div>
                <div className="font-mono text-[9px] tracking-[0.14em] text-[var(--paper-muted)]">
                  EXAMPLE PACK
                </div>
                <div className="display mt-1 text-[28px] text-[var(--paper-text)]">100 次</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[9px] tracking-[0.14em] text-[var(--paper-muted)]">
                  PRICE
                </div>
                <div className="display mt-1 text-[28px] text-[var(--paper-text)]">¥9.90</div>
              </div>
            </div>
            <div className="barcode mt-5 opacity-80" aria-hidden="true" />
            <p className="mt-2 text-center font-mono text-[9px] tracking-[0.18em] text-[var(--paper-muted)]">
              SHARED BY THE TABLE · VALID 90 DAYS
            </p>
            <a
              href="#buy"
              onClick={(e) => scrollToSection(e, 'buy')}
              className="mt-4 flex items-center justify-between border border-[#b9b1a0] px-3 py-2 font-mono text-[10px] tracking-[0.06em] text-[#191b18] transition-colors hover:border-[#191b18]"
            >
              到购买区看真实商品
              <span aria-hidden="true">↓</span>
            </a>
          </article>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STORE_FLOW.map((s) => (
            <div className="card card-hover p-5" key={s.k}>
              <div className="font-mono text-[10px] text-[var(--signal)]">{s.k}</div>
              <div className="mt-2 font-medium">{s.t}</div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted)]">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}