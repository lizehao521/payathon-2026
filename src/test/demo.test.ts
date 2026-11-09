/**
 * 体验模式的装配边界。
 *
 * 守的是「一条命令就能看到完整产品」这件事：demo 不仅要起网关和看板，
 * 商家台（下单 → mock 收银台 → 出码 → 扫码）也必须同进程可用。
 * 这里不重复 biz.test.ts 的闭环，只钉「demo 配置真的把业务层挂上了」。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startDemo } from '../demo.js';

test('体验模式带商家台：/biz 可打开，套餐可下单，mock 收银台给本地付款页', async () => {
  const demo = await startDemo({ port: 0, mockPort: 0, host: '127.0.0.1', interactive: false });
  try {
    const page = await fetch(demo.info.bizUrl);
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes('商家台'));

    const packsRes = await fetch(`${demo.info.url}/biz/api/packs`);
    assert.equal(packsRes.status, 200);
    const { packs } = (await packsRes.json()) as { packs: { id: string }[] };
    assert.ok(packs.some((p) => p.id === 'chat-100'), '体验模式应带对话套餐');

    const orderRes = await fetch(`${demo.info.url}/biz/api/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ packId: 'chat-100', quantity: 1 }),
    });
    assert.equal(orderRes.status, 200);
    const { payment } = (await orderRes.json()) as { payment?: { kind?: string; payUrl?: string } };
    assert.equal(payment?.kind, 'redirect');
    assert.ok(payment?.payUrl?.startsWith('/pay/'));
  } finally {
    await demo.shutdown();
  }
});
