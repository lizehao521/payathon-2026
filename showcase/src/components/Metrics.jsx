const METRICS = [
  { value: '0', unit: '个', label: '运行时依赖', note: '仅 Node 内置模块' },
  { value: '300', unit: '项', label: '测试全部通过', note: 'node --test · 0 fail' },
  { value: '1', unit: 'ms', label: '网关自身开销', note: '成功响应逐字节透传' },
  { value: '9', unit: '家', label: '内置厂商模板', note: '换厂商只改一个 flag' },
  { value: '8', unit: '篇', label: '参赛交付文档', note: '需求到运维全覆盖' },
];

export default function Metrics() {
  return (
    <div className="wrap">
      <div className="meter-strip">
        {METRICS.map((m) => (
          <div className="meter-cell" key={m.label}>
            <div className="meter-value">
              {m.value}
              <span className="ml-1 font-mono text-[11px] font-normal tracking-normal text-[var(--muted)]">
                {m.unit}
              </span>
            </div>
            <div className="meter-label">{m.label}</div>
            <div className="mt-1 font-mono text-[10px] text-[#5a6b6f]">{m.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}