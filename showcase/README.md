# relay-showcase（展示站源码）

PAYATHON 2026 参赛作品的在线展示站。Vite + React，纯静态，无后端。

## 目录

```
src/
  components/     页面区块：Hero、PaymentDemo、StoreLoop、BuyPack、Judging 等
  lib/
    app-sdk.js            WeaveFox 运行时 SDK（浏览器端统一实例）
    weavefox.js           publicId + runtimeEndpoint 单例
    vibe-pay-client.js    Vibe Pay 适配：字段映射、下单、查余额
    scrollToSection.js    站内锚点滚动（避开 hash 路由 404）
  pages/          Home / NotFound
  index.css       设计系统（工业仪表 + 票据）
weavefox.json     应用身份、runtimeEndpoint、vibePay.products（不含密钥）
DESIGN.md         设计基线
```

## 构建

```bash
npm install
node node_modules/vite/bin/vite.js build
```

产物在 `dist/`，`base` 为 `"./"`，可部署在任意子路径。

## 部署

两种方式，任选其一：

1. **WeaveFox Pages**：构建产物 `dist/` 交给平台发布，发布即上线。
2. **GitHub Pages**：把 `dist/` 内容（含 `.nojekyll`）放到仓库 `docs/`，在 Settings → Pages 选择 `main` / `/docs`。

## 运行依赖

购买区调用 `https://www.weavefox.cn` 的运行时接口（`/api/v1/app-runtime/*`、`/api/v1/vibe-pay/*`），
商品与商户绑定在 WeaveFox 侧，仓库里不含任何商户令牌或配置链接。

## 页面性质说明

- 402 握手演示：mock provider，不产生真实扣款。
- 门店票据演示：站内模拟数据，不扣真实额度。
- 购买次数：真实 Vibe Pay 收款，付款进入商家支付宝账户，余额按浏览器买家身份隔离。