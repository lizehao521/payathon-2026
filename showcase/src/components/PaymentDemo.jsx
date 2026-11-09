import { useMemo, useState } from 'react';

const STEPS = ['发出请求', '402 报价', '支付凭证', '200 交付'];

const PANELS = {
  0: {
    title: 'POST /agent/v1/chat/completions',
    tone: 'idle',
    header: [
      ['content-type', 'application/json'],
      ['authorization', '(无 · 按量付费不办卡)'],
    ],
    body: `{
  "model": "mock-small",
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "stream": false
}`,
  },
  1: {
    title: 'HTTP/1.1 402 Payment Required',
    tone: 'pend',
    header: [
      ['amtPaymentLink', 'amtpp_mock_9f2c'],
      ['cache-control', 'no-store'],
    ],
    body: `{
  "error": {
    "message": "该接口按次计费 ¥0.01，支付后凭 Payment-Proof 重试",
    "type": "payment_required",
    "code": "payment_required"
  },
  "payment": {
    "provider": "mock",
    "serviceId": "API-DEMO",
    "amountCny": 0.01,
    "outTradeNo": "mp_lq2x9k_1a2b3c4d5e6f",
    "amtPrePayId": "amtpp_mock_mp_lq2x9k_1a2b3c4d5e6f",
    "payBefore": "2026-11-09T21:30:00+08:00"
  }
}`,
  },
  2: {
    title: 'Payment-Proof: Base64(JSON)',
    tone: 'pend',
    header: [
      ['x-out-trade-no', 'mp_lq2x9k_1a2b3c4d5e6f'],
      ['trade_no', '2026110922001…'],
    ],
    body: `eyJwcm90b2NvbCI6eyJwYXltZW50X3Byb29mIjoi…
// 解码后
{
  "protocol": {
    "payment_proof": "…",
    "trade_no": "2026110922001…"
  },
  "method": { "client_session": "…" }
}`,
  },
  3: {
    title: 'HTTP/1.1 200 OK',
    tone: 'ok',
    header: [
      ['x-relay-billing', 'charged 0.01 CNY'],
      ['x-relay-model-served', 'mock-small'],
    ],
    body: `{
  "id": "chatcmpl-demo",
  "object": "chat.completion",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "你好！这是一次已付费的调用，上游响应原样透传。"
    }
  }],
  "usage": { "prompt_tokens": 9, "completion_tokens": 33, "total_tokens": 42 }
}`,
  },
};

const ACTION_LABEL = [
  '发起一次 Agent 调用',
  '模拟扫码支付 ¥0.01',
  '带 Payment-Proof 重试',
  '再跑一次',
];

const LOG_LINES = {
  0: ['准备请求体，不带任何预付费凭证。'],
  1: ['上游尚未被触达。', '402 已生成预下单，amtPrePayId 在支付截止前复用。'],
  2: ['支付完成，客户端拿到可校验的 Payment-Proof。', '同一交易号重复提交不会二次交付。'],
  3: ['active / amount / out_trade_no / trade_no 全部核对通过。', '成功调用扣费一次，响应逐字节透传。'],
};

export default function PaymentDemo() {
  const [step, setStep] = useState(0);

  const panel = PANELS[step];
  const progress = useMemo(() => step, [step]);

  const advance = () => {
    setStep((s) => (s + 1) % 4);
  };

  return (
    <section id="payment" className="section section-rule">
      <div className="wrap">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
          <div>
            <div className="section-num">03 / THE 402 HANDSHAKE</div>
            <h2 className="section-title mt-4">
              不是报错，
              <br />
              是报价单。
            </h2>
            <p className="lede mt-5 max-w-[440px]">
              大多数网关在余额不足时只说一句 <span className="mono text-[var(--alert)]">insufficient_quota</span>，
              Agent 只能停下等人。这里返回 402 和一张可支付的单据，Agent 可以自己走完
              「付款 → 重试 → 交付」。
            </p>

            <div className="step-rail mt-9">
              {STEPS.map((label, i) => (
                <div
                  key={label}
                  className={`step-item ${i < progress ? 'done' : ''} ${i === progress ? 'current' : ''}`}
                >
                  <span className="mr-1 opacity-60">0{i + 1}</span>
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button type="button" onClick={advance} className="btn btn-primary">
                {ACTION_LABEL[step]}
                <span aria-hidden="true">{step === 3 ? '↻' : '→'}</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="btn btn-ghost"
                disabled={step === 0}
              >
                重置
              </button>
            </div>

            <div className="mt-7 border-l-2 border-[var(--line)] pl-4" aria-live="polite">
              {LOG_LINES[step].map((line) => (
                <p className="font-mono text-[11.5px] leading-relaxed text-[var(--muted)]" key={line}>
                  <span className="mr-2 text-[var(--signal)]">›</span>
                  {line}
                </p>
              ))}
            </div>

            <p className="mt-6 font-mono text-[10px] leading-relaxed tracking-[0.04em] text-[#4d5f63]">
              演示使用仓库内置 mock provider，不产生真实扣款；
              真实环境走支付宝 AI 付并做 RSA2 验签。
            </p>
          </div>

          <div className="terminal self-start">
            <div className="terminal-bar">
              <span className="terminal-dot" />
              <span className="terminal-dot" />
              <span className="terminal-dot" />
              <span className="ml-2 font-mono text-[10.5px] text-[#5a6b6f]">response</span>
              <span
                className={`ml-auto font-mono text-[10px] tracking-[0.08em] ${
                  panel.tone === 'ok'
                    ? 'text-[var(--signal)]'
                    : panel.tone === 'pend'
                      ? 'text-[var(--amber)]'
                      : 'text-[#5a6b6f]'
                }`}
              >
                {step === 0 ? 'REQ' : step === 3 ? '200' : step === 1 ? '402' : 'PROOF'}
              </span>
            </div>

            <div className="border-b border-[var(--line-soft)] px-4 py-3">
              <div
                className={`font-mono text-[12px] ${
                  panel.tone === 'ok'
                    ? 'text-[var(--signal)]'
                    : panel.tone === 'pend'
                      ? 'text-[var(--amber)]'
                      : 'text-[var(--text)]'
                }`}
              >
                {panel.title}
              </div>
              <div className="mt-2 space-y-1">
                {panel.header.map(([k, v]) => (
                  <div className="flex gap-2 font-mono text-[10.5px]" key={k}>
                    <span className="w-[132px] flex-none text-[#5a6b6f]">{k}</span>
                    <span className="text-[#8fa3a0]">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <pre className="terminal-body max-h-[380px] overflow-auto text-[#b9c9c4]">
              {panel.body}
            </pre>

            <div className="flex items-center justify-between border-t border-[var(--line-soft)] bg-[#0a0f12] px-4 py-2.5">
              <span className="font-mono text-[10px] tracking-[0.08em] text-[#4d5f63]">
                {step === 0 && '上游未触达 · 0 次扣费'}
                {step === 1 && '等待支付 · 订单 pending'}
                {step === 2 && '凭证已签发 · 待重试'}
                {step === 3 && '已履约 · 扣费 1 次'}
              </span>
              <span className="font-mono text-[10px] text-[#4d5f63]">step {step}/3</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}