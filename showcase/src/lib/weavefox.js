// WeaveFox 客户端单例 — 应用身份 publicId 来自 weavefox.json
// 创建成功后由 scripts/apply-identity.js 回填;失败时保留 <pending> 并复用同一 requestId 重试
// 切勿在此文件硬编码密钥;publicId 为 <pending> 时不得伪造可上线状态
import { createWeaveFoxClient } from './app-sdk.js';

var PUBLIC_ID = "bnjgchnsjzztmfv9c";
var RUNTIME_ENDPOINT = "https://www.weavefox.cn";
var client = null;
function requireWeavefox() {
  if (!PUBLIC_ID || PUBLIC_ID === '<pending>') {
    throw new Error('WeaveFox 应用身份尚未就绪。请使用 weavefox.json 中原 requestId 重试 builder_apps 创建应用，再运行 scripts/apply-identity.js。');
  }
  var endpoint = RUNTIME_ENDPOINT || globalThis.__WEAVEFOX_RUNTIME_API_ENDPOINT__;
  if (!endpoint) throw new Error('请先调用 app_services 获取 runtimeEndpoint 并回填 SDK 配置');
  if (!client) client = createWeaveFoxClient({ publicId: PUBLIC_ID, endpoint: endpoint });
  return client;
}
export var weavefox = new Proxy({}, {
  get: function (_target, key) {
    var instance = requireWeavefox();
    var value = instance[key];
    return typeof value === "function" ? value.bind(instance) : value;
  }
});
