const DIMENSIONS = [
  {
    label: '产品完整度',
    weight: 30,
    note: '下单、支付、出码、扫码、对话/画图、归零、续购，七步闭环均有页面与读数；按量付费另有一条完整链路。',
  },
  {
    label: '支付集成度',
    weight: 25,
    note: '402 预下单、amtPaymentLink、Payment-Proof 校验、RSA2 验签、金额核对、交易号幂等，错误路径也验收。',
  },
  {
    label: '商业化表现',
    weight: 25,
    note: '卖次数不卖 token，不碰餐费，不依赖厂商返点；包价与上游成本之间保留毛利，续购是设计内的动作。',
  },
  {
    label: '作品影响力',
    weight: 20,
    note: '开源 MIT、单命令可复现、8 篇交付文档与 4 张实拍截图，评委和开发者都能自行验证。',
  },
];

const HONEST = [
  '主仓库的 AI 付（Machine Pay）生产接入未完成：仍需商家 APPID、私钥、公网回调与按量付费 service_id，本轮交付可验证适配器；展示站的 Vibe Pay 次数包已用真实支付宝收款（¥0.99/次，已实测付款到账）。',
  '不做退款、分账、发票与对账文件；不接外卖平台订单接口，单号由店员录入或扫码枪输入。',
  '多实例共享次数闸门未实现：当前 inflight 为进程内预留，库内 uses_used 是权威计数。',
];

export default function Judging() {
  return (
    <section id="judging" className="section section-rule">
      <div className="wrap">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <div className="section-num">08 / SCORECARD</div>
            <h2 className="section-title mt-4">
              按评分表，
              <br />
              逐项交证据。
            </h2>
            <p className="lede mt-5">
              PAYATHON 2026 的四个维度不是口号。下面每一项都对应仓库里可运行、可检查、
              可复现的产物，而不是 PPT 里的形容词。
            </p>

            <div className="mt-8 space-y-5">
              {DIMENSIONS.map((d) => (
                <div key={d.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[15px] font-medium">{d.label}</span>
                    <span className="font-mono text-[11px] text-[var(--signal)]">
                      {d.weight}%
                    </span>
                  </div>
                  <div className="mt-2 h-[3px] w-full bg-[var(--line)]">
                    <div
                      className="h-full bg-[var(--signal)]"
                      style={{ width: `${d.weight}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--muted)]">{d.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--signal)]">
                  DELIVERABLES
                </span>
                <span className="chip">仓库内可查</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-px bg-[var(--line)]">
                {[
                  ['8 篇', '参赛文档'],
                  ['4 张', '流程截图'],
                  ['1 份', '路演 PPT'],
                  ['1 条', 'demo 命令'],
                  ['300 项', '自动化测试'],
                  ['0 个', '运行时依赖'],
                ].map(([v, k]) => (
                  <div key={k} className="bg-[#0a1013] px-4 py-4">
                    <div className="display text-[24px] leading-none">{v}</div>
                    <div className="mt-1.5 font-mono text-[9px] tracking-[0.12em] text-[var(--muted)]">
                      {k}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card border-[#3b2f18] p-6">
              <div className="flex items-center gap-2">
                <span className="dot dot-amber" />
                <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--amber)]">
                  HONEST BOUNDARIES
                </span>
              </div>
              <h3 className="mt-3 text-[17px] font-bold tracking-tight">没做的，也写清楚</h3>
              <ul className="mt-3 space-y-2.5">
                {HONEST.map((line) => (
                  <li
                    key={line}
                    className="flex gap-3 text-[12.5px] leading-relaxed text-[var(--muted)]"
                  >
                    <span className="mt-[7px] h-px w-3 flex-none bg-[var(--amber)]" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6">
              <div className="font-mono text-[10px] tracking-[0.14em] text-[var(--muted)]">
                REPRODUCE IN 30 SECONDS
              </div>
              <pre className="code-block mt-3">
{`git clone https://github.com/lizehao521/payathon-2026
cd payathon-2026
bash demo.sh
# → http://127.0.0.1:8787/admin`}
              </pre>
              <p className="mt-3 text-[12px] leading-relaxed text-[var(--muted)]">
                不需要密钥、不需要配置文件、不需要 npm install。启动后自动打印 5 项自检结果。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}