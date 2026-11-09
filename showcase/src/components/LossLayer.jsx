const LAYERS = [
  {
    id: 'P2',
    title: '调用前预检',
    desc: '畸形 tool_calls、超长上下文、模型能力不匹配，在上游之前就被拦下。不花一分钱，也不浪费一次重试。',
    metric: '上游之前拦截',
  },
  {
    id: 'P3',
    title: '失败归因',
    desc: '把 429 翻译成 retry_with_backoff + retryAfterMs，把余额不足翻译成 top_up_balance。错误从「一句话」变成「下一步动作」。',
    metric: '错误对 Agent 可执行',
  },
  {
    id: 'P8',
    title: '损耗量化',
    desc: '每次失败都归因到具体原因与上游，算出可避免损耗，形成可持续对比的基线，而不是月底对账时才发现。',
    metric: '可归因 · 可对比',
  },
];

export default function LossLayer() {
  return (
    <section id="loss" className="section section-rule">
      <div className="wrap">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <div className="section-num">07 / LOSS CONTROL</div>
            <h2 className="section-title mt-4">
              省下来的，
              <br />
              才是毛利。
            </h2>
            <p className="lede mt-5">
              聚合网关最容易亏钱的地方不在单价，而在「无效调用」：预检没做、失败没说清、
              损耗没归因。这层能力从第一天就在核心链路里，不是事后插件。
            </p>
            <div className="mt-8 border border-[var(--line)] bg-[#0a1013] p-5">
              <div className="font-mono text-[10px] tracking-[0.14em] text-[var(--muted)]">
                一句话定位
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--text)]">
                它卖的不是 token，是
                <span className="text-[var(--signal)]">「错误对 Agent 可执行」</span>。
                成功响应逐字节透传，一点不碰。
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {LAYERS.map((l) => (
              <article key={l.id} className="card card-hover grid gap-4 p-6 sm:grid-cols-[64px_1fr]">
                <div>
                  <div className="display text-[28px] leading-none text-[var(--signal)]">{l.id}</div>
                  <div className="mt-1 font-mono text-[9px] tracking-[0.1em] text-[#5a6b6f]">
                    LAYER
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[19px] font-bold tracking-tight">{l.title}</h3>
                    <span className="font-mono text-[9.5px] tracking-[0.1em] text-[var(--muted)]">
                      {l.metric}
                    </span>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">{l.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-4 py-2.5">
              <span className="font-mono text-[10px] tracking-[0.12em] text-[#5a6b6f]">
                裸上游 · 只有一句报错
              </span>
              <span className="chip border-[#4a2a24] text-[var(--alert)]">Agent 只能停</span>
            </div>
            <pre className="code-block m-0 border-0 bg-transparent">
{`HTTP/1.1 429 Too Many Requests

{
  "error": {
    "message": "Rate limit exceeded"
  }
}`}
            </pre>
          </div>

          <div className="card overflow-hidden border-[#1f4a3c]">
            <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-4 py-2.5">
              <span className="font-mono text-[10px] tracking-[0.12em] text-[var(--signal)]">
                api-relay · 给出下一步
              </span>
              <span className="chip border-[#1f4a3c] text-[var(--signal)]">可执行</span>
            </div>
            <pre className="code-block m-0 border-0 bg-transparent">
{`HTTP/1.1 429

{
  "error": { "code": "rate_limited" },
  "relay": {
    "action": "retry_with_backoff",
    "retryAfterMs": 2000
  }
}

// 余额不足 →
// 402 + "action": "top_up_balance"
// 明确告诉 Agent 不要重试`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}