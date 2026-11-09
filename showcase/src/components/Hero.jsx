import { useEffect, useState } from 'react';
import { scrollToSection } from '../lib/scrollToSection.js';

const LINES = [
  { ts: '+0ms', tag: '→', text: 'POST /agent/v1/chat/completions', tone: 'dim' },
  { ts: '+2ms', tag: '402', text: 'payment_required  amtPaymentLink: amtpp_mock_9f2c', tone: 'pend' },
  { ts: '+2ms', tag: 'pay', text: '支付宝 AI 付 · ¥0.01 · 待支付', tone: 'pend' },
  { ts: '+9ms', tag: '→', text: 'Payment-Proof: eyJvdXRfdHJhZGVfbm8iOiJtcF8…', tone: 'dim' },
  { ts: '+12ms', tag: '✓', text: 'verify  active=true  amount=0.01  交易号匹配', tone: 'ok' },
  { ts: '+14ms', tag: '200', text: '交付完成 · 扣费 ¥0.01 · 幂等键已登记', tone: 'ok' },
];

export default function Hero() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(LINES.length);
      return;
    }
    const timers = LINES.map((_, i) =>
      window.setTimeout(() => setVisible(i + 1), 900 + i * 620)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const replay = () => {
    setVisible(0);
    LINES.forEach((_, i) => {
      window.setTimeout(() => setVisible(i + 1), 240 + i * 620);
    });
  };

  return (
    <section id="top" className="relative overflow-hidden pt-[128px] pb-[72px] md:pt-[164px]">
      <div className="pointer-events-none absolute -left-40 top-10 h-[520px] w-[520px] glow-signal opacity-70" />
      <div className="pointer-events-none absolute -right-24 top-64 h-[420px] w-[420px] glow-amber opacity-60" />

      <div className="wrap relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
          <div>
            <div className="eyebrow">PAYATHON 2026 · MACHINE PAY × VIBE PAY</div>

            <h1 className="display mt-6 text-[clamp(32px,6.6vw,78px)]">
              <span className="block overflow-hidden">
                <span className="hero-line block">错误要可执行，</span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-line block text-[var(--signal)]" style={{ animationDelay: '120ms' }}>
                  调用要能收钱。
                </span>
              </span>
            </h1>

            <p className="lede mt-7 max-w-[540px]">
              api-relay 把 <strong className="font-medium text-[var(--text)]">OpenAI 兼容网关</strong>、
              <strong className="font-medium text-[var(--text)]">失败归因</strong> 与
              <strong className="font-medium text-[var(--text)]">支付宝 AI 付</strong>{' '}
              装进同一个零依赖进程。Agent 没付钱就收到 HTTP 402；付完带上 Payment-Proof
              重试，原样拿到结果。门店则买次数包、贴码、扫码即用。
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#payment" onClick={(e) => scrollToSection(e, 'payment')} className="btn btn-primary">
                亲手跑一次 402
                <span aria-hidden="true">↓</span>
              </a>
              <a
                href="https://github.com/lizehao521/payathon-2026"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
              >
                查看源码
                <span aria-hidden="true">↗</span>
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[11px] tracking-[0.06em] text-[var(--muted)]">
              <span className="flex items-center gap-2">
                <span className="dot dot-live" /> 5 项启动自检全绿
              </span>
              <span>0 运行时依赖</span>
              <span>300 项测试通过</span>
              <span>9 家厂商模板</span>
            </div>
          </div>

          <div className="relative">
            <div className="terminal">
              <div className="terminal-bar">
                <span className="terminal-dot" />
                <span className="terminal-dot" />
                <span className="terminal-dot" />
                <span className="ml-2 font-mono text-[10.5px] text-[#5a6b6f]">
                  agent · live handshake
                </span>
                <span className="ml-auto flex items-center gap-2 font-mono text-[10px] text-[var(--signal)]">
                  <span className="dot dot-live" /> 402 → 200
                </span>
              </div>

              <div className="terminal-body terminal-body--wrap min-h-[248px]" aria-live="polite">
                {LINES.slice(0, visible).map((line) => (
                  <div className="tline" key={line.text}>
                    <span className="ts">{line.ts}</span>
                    <span className={line.tone === 'ok' ? 'ok' : line.tone === 'pend' ? 'pend' : 'dim'}>
                      {line.tag}
                    </span>
                    <span className={line.tone === 'ok' ? 'text-[#cde8dd]' : 'text-[#8fa3a0]'}>
                      {line.text}
                    </span>
                  </div>
                ))}
                {visible < LINES.length && (
                  <div className="tline">
                    <span className="ts"> </span>
                    <span className="cursor-block" aria-hidden="true">
                      ▌
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--line-soft)] bg-[#0a0f12] px-4 py-2.5">
                <span className="font-mono text-[10px] tracking-[0.1em] text-[#4d5f63]">
                  MOCK PROVIDER · 不产生真实扣款
                </span>
                <button
                  type="button"
                  onClick={replay}
                  className="font-mono text-[10px] tracking-[0.08em] text-[var(--muted)] underline decoration-dotted underline-offset-4 hover:text-[var(--signal)]"
                >
                  重播
                </button>
              </div>
            </div>

            <div className="absolute -bottom-7 -left-5 hidden w-[190px] border border-[#2c4147] bg-[#0b1114] p-4 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.9)] sm:block">
              <div className="flex items-center justify-between font-mono text-[9.5px] tracking-[0.12em] text-[var(--muted)]">
                <span>本次计量</span>
                <span className="text-[var(--signal)]">PAID</span>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className="display text-[30px] leading-none">¥0.01</span>
                <span className="font-mono text-[10px] text-[var(--muted)]">/ 次</span>
              </div>
              <div className="mt-3 h-px w-full bg-[var(--line)]" />
              <div className="mt-2 font-mono text-[9.5px] leading-relaxed text-[#5a6b6f]">
                同一交易号只履约一次
                <br />
                上游失败可原凭证重试
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}