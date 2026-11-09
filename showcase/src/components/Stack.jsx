const ITEMS = [
  {
    t: '零运行时依赖',
    d: '只用 node:http / node:crypto / node:sqlite。没有 node_modules 也能启动，部署面就是一堆源码。',
  },
  {
    t: '成功响应逐字节透传',
    d: 'SSE 流式逐块转发，网关不解析、不改写、不缓存成功内容；只在错误路径上附加可执行信息。',
  },
  {
    t: '上游池 + 熔断 + 档位阶梯',
    d: '旗舰 / 平衡 / 极速按能力与成本排序；上游异常自动下沉，换模型必回传 x-relay-switched。',
  },
  {
    t: '支付安全默认开启',
    d: 'RSA2 验签、金额差校验、常数时间比较、事务号幂等、日志脱敏；管理令牌不出现在页面与日志。',
  },
  {
    t: '一条命令可验证',
    d: 'demo.sh 单进程起 mock 上游 + 网关 + 看板，自动避开端口并跑 5 项自检；不需要任何密钥。',
  },
  {
    t: '可运维，不靠猜',
    d: 'relay check 自检配置，SQLite WAL 存控制面，业务库与度量库分离，备份与巡检脚本齐备。',
  },
];

export default function Stack() {
  return (
    <section id="stack" className="section section-rule">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="section-num">08 / THE BASEMENT</div>
            <h2 className="section-title mt-4">
              零依赖不是洁癖，
              <br className="hidden sm:block" />
              是可交付。
            </h2>
          </div>
          <div className="flex gap-8">
            <div>
              <div className="display text-[38px] leading-none">77</div>
              <div className="mt-1 font-mono text-[9px] tracking-[0.12em] text-[var(--muted)]">
                源码文件
              </div>
            </div>
            <div>
              <div className="display text-[38px] leading-none">27k</div>
              <div className="mt-1 font-mono text-[9px] tracking-[0.12em] text-[var(--muted)]">
                行 TypeScript
              </div>
            </div>
            <div>
              <div className="display text-[38px] leading-none text-[var(--signal)]">300</div>
              <div className="mt-1 font-mono text-[9px] tracking-[0.12em] text-[var(--muted)]">
                项测试通过
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-px border border-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <article
              key={item.t}
              className="group bg-[#0a0f12] p-6 transition-colors hover:bg-[#0d1519]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[var(--signal)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="h-px w-6 bg-[var(--line)] transition-all group-hover:w-10 group-hover:bg-[var(--signal)]" />
              </div>
              <h3 className="mt-4 text-[17px] font-bold tracking-tight">{item.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{item.d}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] tracking-[0.08em] text-[#5a6b6f]">
          <span>Node ≥ 22.5</span>
          <span>TypeScript 5.6 strict</span>
          <span>ESM</span>
          <span>SQLite WAL</span>
          <span>MIT License</span>
          <span className="text-[var(--muted)]">npm install 不是启动前提</span>
        </div>
      </div>
    </section>
  );
}