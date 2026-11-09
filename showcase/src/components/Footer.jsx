import { scrollToSection } from '../lib/scrollToSection.js';

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--line)] pb-10 pt-20">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[340px] w-[680px] -translate-x-1/2 glow-signal opacity-50" />
      <div className="wrap relative">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="eyebrow">PAYATHON 2026 · SUBMISSION</div>
            <h2 className="display mt-5 text-[clamp(34px,5.6vw,64px)]">
              先跑起来，
              <br />
              <span className="text-[var(--signal)]">再谈规模。</span>
            </h2>
            <p className="lede mt-5 max-w-[460px]">
              一条命令、零密钥、零运行时依赖。你可以先让 Agent 收到一次 402，
              再决定要不要把它接进生产。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://github.com/lizehao521/payathon-2026"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                GitHub 仓库
                <span aria-hidden="true">↗</span>
              </a>
              <a href="#payment" onClick={(e) => scrollToSection(e, 'payment')} className="btn btn-ghost">
                再看一次 402 链路
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
            {[
              ['赛道', 'Machine Pay'],
              ['赛道', 'Vibe Pay'],
              ['许可', 'MIT'],
              ['入口', '/admin'],
              ['支付', 'AI 付 · 402'],
              ['部署', '单进程'],
            ].map(([k, v], i) => (
              <div key={`${k}-${i}`} className="bg-[#0a0f12] p-4">
                <div className="font-mono text-[9px] tracking-[0.14em] text-[#5a6b6f]">{k}</div>
                <div className="mt-1.5 font-mono text-[12px] text-[var(--text)]">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-[var(--line-soft)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-6 w-6 place-items-center border border-[#2b3a3f] bg-[#0b1114]">
              <span className="h-2 w-2 bg-[var(--signal)]" />
            </span>
            <span className="font-mono text-[11px] tracking-[0.06em] text-[var(--muted)]">
              api-relay · PAYATHON 2026 参赛作品
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] text-[#5a6b6f]">
            <span>展示站数据来自仓库 README / 测试结果</span>
            <span>402 演示不扣款 · 购买区真实收款</span>
            <a
              href="https://aipay.alipay.com/community/events/payathon-2026"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--muted)]"
            >
              赛事主页 ↗
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}