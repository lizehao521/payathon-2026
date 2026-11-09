const LEFT = [
  {
    src: './shots/console.png',
    alt: '商家台：两笔已支付订单、核销码与统计',
    step: '商家台',
    caption: '¥10.39 · 2 单已付 · 1 次已核销 · 2 个在用码',
    ratio: '1440 / 1416',
  },
  {
    src: './shots/code.png',
    alt: '订单卡片：二维码、核销码与剩余次数',
    step: '出码',
    caption: '码 YY83-VKGF · 100 次 · 到期 2027/2/7',
    ratio: '1032 / 189',
  },
];

const RIGHT = [
  {
    src: './shots/checkout.png',
    alt: '演示收银台：标准对话 100 次，¥9.90',
    step: '收银台',
    caption: 'mock 收银台 · 订单 ¥9.90 · 付款后自动出码',
    ratio: '560 / 439',
  },
  {
    src: './shots/label.png',
    alt: '58mm 外卖单标签：单号、二维码与到期日',
    step: '单码',
    caption: '单号 A20261109001 → RPGC-FKN4 · 58mm 标签',
    ratio: '438 / 302',
  },
  {
    src: './shots/scan.png',
    alt: '顾客扫码页：提问后剩余次数从 100 变 99',
    step: '扫码',
    caption: '扫码一问一答，答完剩 99 / 100 次',
    ratio: '420 / 900',
  },
];

const FACTS = [
  { k: '6 / 6', v: '启动自检' },
  { k: '301', v: '项单测' },
  { k: '0', v: '密钥依赖' },
  { k: '1', v: '个进程' },
];

function Shot({ shot }) {
  return (
    <figure className="card overflow-hidden">
      <a
        href={shot.src}
        target="_blank"
        rel="noopener"
        className="group block overflow-hidden bg-[#f5f7fb]"
        style={{ aspectRatio: shot.ratio }}
        aria-label={`${shot.step}：放大查看`}
      >
        <img
          src={shot.src}
          alt={shot.alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.01]"
        />
      </a>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-[var(--line-soft)] px-4 py-3">
        <span className="mono text-[10px] tracking-[0.14em] text-[var(--signal)]">{shot.step}</span>
        <span className="mono text-[10.5px] text-[var(--muted)]">{shot.caption}</span>
      </figcaption>
    </figure>
  );
}

export default function LiveRun() {
  return (
    <section id="live" className="section section-rule">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="section-num">06 / LIVE RUN</div>
            <h2 className="section-title mt-4">
              <span className="block">真机跑通，</span>
              <span className="block">不是一张流程图。</span>
            </h2>
          </div>
          <p className="lede max-w-[430px]">
            <span className="mono text-[13px] text-[var(--text)]">bash demo.sh</span>{' '}
            起一个进程：mock 上游、网关、看板、商家台都在里面。下面五张是本地截图——
            点的是真按钮，扣的是真次数，没有画稿。
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-8">
            {LEFT.map((shot) => (
              <Shot key={shot.step} shot={shot} />
            ))}

            <div className="card flex flex-col justify-between p-6">
              <div>
                <div className="mono text-[9.5px] tracking-[0.14em] text-[var(--muted)]">
                  WHAT ACTUALLY HAPPENED
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--muted)]">
                  下单 → mock 收银台付款 → 自动出码 → 扫码提问 → 剩余次数 100 → 99。
                  外卖单码走同一条池子：同一个单号再录一次，返回原码、不重复扣码。
                  整条链路没有任何外部凭据，也没有人工改库。
                </p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {FACTS.map((f) => (
                  <div key={f.v}>
                    <div className="display text-[30px] leading-none text-[var(--text)]">{f.k}</div>
                    <div className="mono mt-1.5 text-[9px] tracking-[0.12em] text-[var(--muted)]">
                      {f.v}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mono mt-6 text-[9.5px] leading-relaxed text-[#4d5f63]">
                截图取自本地 127.0.0.1:8899；金额与次数为体验模式 mock 数据。
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-4">
            {RIGHT.map((shot) => (
              <Shot key={shot.step} shot={shot} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
