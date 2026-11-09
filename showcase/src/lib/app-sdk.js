// src/service-request.js
var JSON_HEADERS = { "Content-Type": "application/json" };
function createServiceRequest({ request, createError }) {
  async function call(provider, path, init, { envelope = false } = {}) {
    const response = await request(provider, path, init);
    let body;
    try {
      body = await response.json();
    } catch {
      throw createError("WeaveFox service returned invalid JSON", response.status, response);
    }
    const hasBusinessCode = typeof body?.code === "number";
    const businessSuccess = !hasBusinessCode || body.code === 0 || body.code === 200;
    if (!response.ok || !businessSuccess) {
      const error = createError(
        body?.message || `WeaveFox service request failed: ${response.status}`,
        response.status,
        response
      );
      error.code = body?.code;
      error.subCode = body?.subCode;
      error.traceId = body?.traceId;
      throw error;
    }
    return envelope ? body : body?.data;
  }
  return {
    call,
    getEnvelope: (provider, path, params) => call(provider, withQuery(path, params), { method: "GET" }, { envelope: true }),
    getData: (provider, path, params) => call(provider, withQuery(path, params), { method: "GET" }),
    postData: (provider, path, body) => call(provider, path, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(body ?? {})
    })
  };
}
function withQuery(path, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === void 0 || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `${path}?${encoded}` : path;
}
function createRandomId(prefix) {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

// src/services/alipay-aipay.js
function createAlipayAipayClient({ request, postData }) {
  const client = {
    request: (path, init) => request("alipay-aipay", path, init),
    createPagePay: (params) => postData("alipay-aipay", "/api/v1/alipay-aipay/create-page-pay", params),
    queryTrade: (params) => postData("alipay-aipay", "/api/v1/alipay-aipay/query-trade", params),
    queryRefund: (params) => postData("alipay-aipay", "/api/v1/alipay-aipay/query-refund", params)
  };
  client.watchTradeStatus = (params, options = {}) => watchTradeStatus(client.queryTrade, params, options);
  return client;
}
function watchTradeStatus(queryTrade, params, options) {
  const pollSteps = options.pollSteps ?? [3e3, 5e3, 8e3, 1e4];
  const maxDurationMs = options.maxDurationMs ?? 10 * 60 * 1e3;
  const terminal = /* @__PURE__ */ new Set(["TRADE_SUCCESS", "TRADE_FINISHED", "TRADE_CLOSED"]);
  let stopped = false;
  let timer;
  let timeoutTimer;
  let pollCount = 0;
  let resolvePromise;
  let latestResult = null;
  let latestError = null;
  const cleanup = () => {
    if (timer) clearTimeout(timer);
    if (timeoutTimer) clearTimeout(timeoutTimer);
  };
  const finish = (reason) => {
    if (stopped) return;
    stopped = true;
    cleanup();
    resolvePromise({ reason, result: latestResult, error: latestError });
  };
  const poll = async () => {
    if (stopped) return;
    try {
      latestResult = await queryTrade(params);
      latestError = null;
      options.onUpdate?.(latestResult);
      const status = latestResult?.tradeStatus || latestResult?.trade_status;
      if (terminal.has(status)) return finish("terminal");
    } catch (error) {
      latestError = error instanceof Error ? error : new Error(String(error));
      options.onError?.(latestError);
    }
    const interval = pollSteps[Math.min(pollCount, pollSteps.length - 1)];
    pollCount += 1;
    timer = setTimeout(poll, interval);
  };
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });
  timeoutTimer = setTimeout(() => finish("timeout"), maxDurationMs);
  void poll();
  return { promise, stop: () => finish("stopped") };
}

// src/services/alipay-open-id.js
function createAlipayOpenIdClient({ request, getData, postData }) {
  const client = {
    request: (path, init) => request("alipay-open-id", path, init),
    async isConfigured() {
      try {
        const data = await getData("alipay-open-id", "/api/v1/alipay-open-id/configured");
        return data?.configured === true;
      } catch {
        return false;
      }
    },
    getAppId: async () => {
      const data = await getData("alipay-open-id", "/api/v1/alipay-open-id/app-id");
      return data?.appId;
    },
    getOpenId: async (authCode) => {
      const data = await postData("alipay-open-id", "/api/v1/alipay-open-id/get-open-id", {
        authCode
      });
      return data?.openId;
    },
    getUserInfo: (authCode, configId) => postData("alipay-open-id", "/api/v1/alipay-open-id/get-user-info", {
      authCode,
      ...configId ? { configId } : {}
    }),
    detectEnvironment() {
      if (typeof window === "undefined") return "unknown";
      if (isInAlipayMiniprogram()) return "miniprogram";
      if (window.AlipayJSBridge || /AlipayClient/i.test(navigator.userAgent)) return "h5";
      return "unknown";
    },
    async loadH5Sdk(sdkUrl) {
      if (typeof window === "undefined") throw new Error("\u652F\u4ED8\u5B9D H5 SDK \u53EA\u80FD\u5728\u6D4F\u89C8\u5668\u52A0\u8F7D");
      if (window.ap) return;
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = sdkUrl || "https://gw.alipayobjects.com/as/g/h5-lib/alipayjsapi/3.1.1/alipayjsapi.min.js";
        script.async = true;
        script.onload = () => window.ap ? resolve() : reject(new Error("\u652F\u4ED8\u5B9D H5 SDK \u52A0\u8F7D\u5931\u8D25"));
        script.onerror = () => reject(new Error("\u652F\u4ED8\u5B9D H5 SDK \u52A0\u8F7D\u5931\u8D25"));
        document.head.appendChild(script);
      });
    },
    async getAuthCode(options = {}) {
      if (typeof window !== "undefined") {
        const code = new URL(window.location.href).searchParams.get("auth_code");
        if (code) return code;
      }
      const environment = client.detectEnvironment();
      if (environment === "miniprogram") return getMiniprogramAuthCode(options);
      if (environment !== "h5") throw new Error("\u8BF7\u5728\u652F\u4ED8\u5B9D App \u5185\u6253\u5F00\u9875\u9762\u540E\u83B7\u53D6\u6388\u6743\u7801");
      const appId = options.appId || await client.getAppId();
      await client.loadH5Sdk(options.sdkUrl);
      const scopes = Array.isArray(options.scopes) ? options.scopes : [options.scopes || "auth_base"];
      return new Promise((resolve, reject) => {
        window.ap.getAuthCode({
          appId: appId.trim(),
          scopes,
          showErrorTip: options.showErrorTip ?? true,
          success: (result) => resolve(result.authCode),
          fail: (error) => reject(new Error(error?.errorMessage || "\u83B7\u53D6\u652F\u4ED8\u5B9D\u6388\u6743\u7801\u5931\u8D25"))
        });
      });
    },
    async login(options = {}) {
      const authCode = await client.getAuthCode(options);
      if (options.userInfo) return client.getUserInfo(authCode, options.configId);
      return { authCode, openId: await client.getOpenId(authCode) };
    }
  };
  return client;
}
function isInAlipayMiniprogram() {
  return typeof window !== "undefined" && typeof window.my !== "undefined" && typeof window.my.postMessage === "function";
}
async function getMiniprogramAuthCode(options) {
  const timeout = options.timeout ?? 1e4;
  const scope = Array.isArray(options.scopes) ? options.scopes.join(",") : options.scopes || "auth_base";
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("\u83B7\u53D6\u652F\u4ED8\u5B9D\u6388\u6743\u7801\u8D85\u65F6")), timeout);
    const previous = window.my.onMessage;
    window.my.onMessage = (event) => {
      previous?.(event);
      const authCode = event?.authCode || event?.data?.authCode;
      if (!authCode) return;
      clearTimeout(timer);
      window.my.onMessage = previous;
      resolve(authCode);
    };
    window.my.postMessage({ type: "request_auth_code", scopes: scope });
  });
}

// src/services/amap.js
function createAmapClient({ request, getEnvelope }) {
  const client = {
    request: (path, init) => request("amap", path, init),
    geocode: (address, city) => getEnvelope("amap", "/api/v1/amap/geocode", { address, city }),
    reGeocode: (location, options = {}) => getEnvelope("amap", "/api/v1/amap/regeocode", { location, ...options }),
    searchPoi: (keywords, options = {}) => getEnvelope("amap", "/api/v1/amap/poi/search", { keywords, ...options }),
    searchPoiAround: (location, options = {}) => getEnvelope("amap", "/api/v1/amap/poi/around", { location, ...options }),
    drivingRoute: (origin, destination, options = {}) => getEnvelope("amap", "/api/v1/amap/route/driving", { origin, destination, ...options }),
    walkingRoute: (origin, destination) => getEnvelope("amap", "/api/v1/amap/route/walking", { origin, destination }),
    bicyclingRoute: (origin, destination) => getEnvelope("amap", "/api/v1/amap/route/bicycling", { origin, destination }),
    transitRoute: (origin, destination, city, options = {}) => getEnvelope("amap", "/api/v1/amap/route/transit", {
      origin,
      destination,
      city,
      ...options
    }),
    searchDistrict: (keywords, options = {}) => getEnvelope("amap", "/api/v1/amap/district", { keywords, ...options }),
    getWeather: (city, extensions = "base") => getEnvelope("amap", "/api/v1/amap/weather", { city, extensions }),
    inputTips: (keywords, options = {}) => getEnvelope("amap", "/api/v1/amap/tips", {
      keywords,
      ...typeof options === "string" ? { city: options } : options
    })
  };
  client.regeocode = client.reGeocode;
  return client;
}

// src/services/audio.js
function createAudioClient({ request, postData }) {
  const client = {
    request: (path, init) => request("audio", path, init),
    recognize: (audio, options = {}) => postData("audio", "/api/v1/multimodal-service/audio", { audio, ...options })
  };
  client.transcribe = (audio, options = {}) => client.recognize(audio, { scene: "audio_transcription", ...options });
  client.analyze = (audio, question) => client.recognize(audio, { scene: "audio_understanding", prompt: question });
  client.analyzeEmotion = (audio) => client.recognize(audio, { scene: "audio_emotion" });
  client.analyzeConversation = (audio) => client.recognize(audio, { scene: "audio_conversation" });
  client.analyzeVideo = (audio, question) => client.recognize(audio, { scene: "video_audio", prompt: question });
  return client;
}

// src/services/dingtalk.js
function createDingtalkClient({ request, postData }) {
  return {
    request: (path, init) => request("dingtalk", path, init),
    send: (type, payload, options = {}) => postData("dingtalk", "/api/v1/dingtalk-notify/send", { type, ...payload, ...options }),
    sendText: (content, options = {}) => postData("dingtalk", "/api/v1/dingtalk-notify/send/text", { content, ...options }),
    sendMarkdown: (title, content, options = {}) => postData("dingtalk", "/api/v1/dingtalk-notify/send/markdown", {
      title,
      content,
      ...options
    }),
    sendCard: (title, content, btnTitle, btnUrl, options = {}) => postData("dingtalk", "/api/v1/dingtalk-notify/send/card", {
      title,
      content,
      btnTitle,
      btnUrl,
      ...options
    })
  };
}

// src/services/image.js
function createImageClient({ request, postData }) {
  const client = {
    request: (path, init) => request("image", path, init),
    generate: (prompt, options = {}) => postData("image", "/api/v1/multimodal-service/image-generate", { prompt, ...options }),
    edit: (image, prompt, options = {}) => postData("image", "/api/v1/multimodal-service/image-edit", { image, prompt, ...options })
  };
  client.editBackground = client.edit;
  client.editMaterial = client.edit;
  client.editCharacter = client.edit;
  return client;
}

// src/services/llm.js
function createLlmClient({ request, postData }) {
  const client = {
    request: (path, init) => request("llm", path, init),
    call: (messages, options = {}) => postData("llm", "/api/v1/llm-service/completion", { messages, ...options }),
    createCapability(config) {
      const { systemPrompt, userPromptTemplate, options = {} } = config;
      return (input, callOptions = {}) => {
        const userPrompt = userPromptTemplate ? userPromptTemplate.replace(/\{\{input\}\}/g, input) : input;
        return client.call(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          { ...options, ...callOptions }
        );
      };
    }
  };
  client.complete = client.call;
  return client;
}

// src/services/mail.js
function createMailClient({ request, postData }) {
  const client = {
    request: (path, init) => request("mail", path, init),
    send: (params) => postData("mail", "/api/v1/mail-service/send", params)
  };
  client.sendMail = client.send;
  return client;
}

// src/services/ocr.js
function createOcrClient({ request, postData }) {
  const client = {
    request: (path, init) => request("ocr", path, init),
    recognize: (image, options = {}) => postData("ocr", "/api/v1/multimodal-service/ocr", { image, ...options })
  };
  client.recognizeText = (image, options = {}) => client.recognize(image, { scene: "general_image", ...options });
  client.recognizeTable = (image) => client.recognize(image, { scene: "table" });
  client.recognizeHandwriting = (image) => client.recognize(image, { scene: "handwriting" });
  client.recognizeInvoice = (image) => client.recognize(image, { scene: "invoice" });
  client.recognizeIdCard = (image) => client.recognize(image, { scene: "id_card" });
  client.recognizeDocument = (image) => client.recognize(image, { scene: "document" });
  client.recognizeMathLatex = (image) => client.recognize(image, { scene: "math_latex" });
  client.visualQuestion = (image, question) => client.recognize(image, { scene: "visual_qa", prompt: question });
  client.recognizeGui = (image) => client.recognize(image, { scene: "gui" });
  client.recognizeSpecies = (image) => client.recognize(image, { scene: "species_recognition" });
  return client;
}

// src/services/oss.js
function createOssClient({ request, call }) {
  const client = {
    request: (path, init) => request("oss", path, init),
    async upload(file, fileName) {
      if (!file) throw new TypeError("file is required");
      if (!fileName) throw new TypeError("fileName is required");
      let blob = file;
      if (file instanceof ArrayBuffer) blob = new Blob([file]);
      if (!(blob instanceof Blob)) throw new TypeError("file must be Blob, File, or ArrayBuffer");
      const form = new FormData();
      form.append("file", blob, fileName);
      const data = await call("oss", "/api/v1/oss-service/upload", {
        method: "POST",
        body: form
      });
      return data?.fileUrl;
    }
  };
  client.uploadFile = client.upload;
  return client;
}

// src/services/security-check.js
function createSecurityCheckClient({ request, postData }) {
  return {
    request: (path, init) => request("security-check", path, init),
    check: (input = {}) => postData("security-check", "/api/v1/security-check/check", input),
    checkText: (text) => postData("security-check", "/api/v1/security-check/check", { text }),
    checkImages: (imageUrls) => postData("security-check", "/api/v1/security-check/check", {
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [imageUrls]
    })
  };
}

// src/services/tracking.js
function createTrackingClient({ publicId, publicRequest, createError }) {
  const sessionId = createRandomId("session");
  const fingerprint = createRandomId("fingerprint");
  const sessionStart = Date.now();
  const client = {
    request: (path, init) => publicRequest(path, init),
    async collect(events) {
      if (!publicId) throw new TypeError("publicId is required for tracking");
      const response = await publicRequest("/api/v1/tracker/event", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ appId: publicId, events })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.code === "number" && body.code !== 0) {
        throw createError(body.message || "\u57CB\u70B9\u4E0A\u62A5\u5931\u8D25", response.status, response);
      }
      return body.data;
    },
    track(event, data = {}) {
      const now = Date.now();
      return client.collect([
        {
          event,
          timestamp: now,
          nonce: createRandomId("event"),
          fingerprint,
          data: {
            ...getPageTrackingData(),
            ...data,
            sessionId,
            sessionStart
          }
        }
      ]);
    }
  };
  return client;
}
function getPageTrackingData() {
  if (typeof window === "undefined") return {};
  return {
    url: window.location?.href,
    title: globalThis.document?.title,
    referrer: globalThis.document?.referrer,
    language: globalThis.navigator?.language,
    screen: window.screen ? `${window.screen.width}x${window.screen.height}` : void 0,
    viewport: `${window.innerWidth}x${window.innerHeight}`
  };
}

// src/services/vibe-pay.js
function createVibePayClient({ request, getData, postData }) {
  return {
    request: (path, init) => request("vibe-pay", path, init),
    listProducts: () => getData("vibe-pay", "/api/v1/vibe-pay/products"),
    consultPurchase: (params) => postData("vibe-pay", "/api/v1/vibe-pay/purchase/consult", params),
    createPurchase: (params) => postData("vibe-pay", "/api/v1/vibe-pay/purchase/create", params),
    queryQuota: (params) => postData("vibe-pay", "/api/v1/vibe-pay/quota/query", params),
    verifyQuota: (params) => postData("vibe-pay", "/api/v1/vibe-pay/quota/verify", params),
    refreshQuota: (params) => postData("vibe-pay", "/api/v1/vibe-pay/quota/refresh", params),
    createRequestNo(prefix = "vibe-pay") {
      const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return `${prefix}-${randomPart}`;
    }
  };
}

// src/services/index.js
function createBuiltInServices(context) {
  const serviceContext = { ...context, ...createServiceRequest(context) };
  return {
    amap: createAmapClient(serviceContext),
    llm: createLlmClient(serviceContext),
    ocr: createOcrClient(serviceContext),
    audio: createAudioClient(serviceContext),
    image: createImageClient(serviceContext),
    oss: createOssClient(serviceContext),
    securityCheck: createSecurityCheckClient(serviceContext),
    mail: createMailClient(serviceContext),
    dingtalk: createDingtalkClient(serviceContext),
    alipayOpenId: createAlipayOpenIdClient(serviceContext),
    alipayAipay: createAlipayAipayClient(serviceContext),
    vibePay: createVibePayClient(serviceContext),
    tracking: createTrackingClient(serviceContext)
  };
}

// src/runtime-client.js
var REFRESH_MARGIN_SECONDS = 30;
var WeaveFoxServiceError = class extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "WeaveFoxServiceError";
    this.status = status;
    this.response = response;
  }
};
function createWeaveFoxClient(options) {
  const publicId = String(options?.publicId ?? "").trim();
  if (!publicId) throw new TypeError("publicId is required");
  const endpoint = String(options?.endpoint ?? "").trim().replace(/\/+$/, "");
  if (!endpoint) throw new TypeError("endpoint is required");
  const fetchImpl = options?.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("fetch is not available");
  let sessionPromise;
  const tokens = /* @__PURE__ */ new Map();
  const refreshes = /* @__PURE__ */ new Map();
  async function createSession() {
    const response = await fetchImpl(`${endpoint}/api/v1/app-runtime/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId })
    });
    if (!response.ok) throw await responseError(response, "Failed to create runtime session");
    return response.json();
  }
  function getSession() {
    sessionPromise || (sessionPromise = createSession().catch((error) => {
      sessionPromise = void 0;
      throw error;
    }));
    return sessionPromise;
  }
  async function issueToken(provider, allowSessionRetry = true) {
    const session = await getSession();
    const response = await fetchImpl(`${endpoint}/api/v1/app-runtime/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.sessionToken}`
      },
      body: JSON.stringify({ provider })
    });
    if (response.status === 401 && allowSessionRetry) {
      sessionPromise = void 0;
      return issueToken(provider, false);
    }
    if (!response.ok) throw await responseError(response, `Failed to issue ${provider} token`);
    const issued = await response.json();
    tokens.set(provider, issued);
    return issued.token;
  }
  async function getToken(provider, force = false) {
    const cached = tokens.get(provider);
    const now = Math.floor(Date.now() / 1e3);
    if (!force && cached?.token && cached.expiresAt - REFRESH_MARGIN_SECONDS > now) {
      return cached.token;
    }
    if (!refreshes.has(provider)) {
      refreshes.set(
        provider,
        issueToken(provider).finally(() => refreshes.delete(provider))
      );
    }
    return refreshes.get(provider);
  }
  async function request(provider, path, init = {}, allowRetry = true) {
    const token = await getToken(provider);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const response = await fetchImpl(resolveRequestUrl(endpoint, path), { ...init, headers });
    if (response.status === 401 && allowRetry) {
      tokens.delete(provider);
      await getToken(provider, true);
      return request(provider, path, init, false);
    }
    return response;
  }
  function publicRequest(path, init = {}) {
    return fetchImpl(resolveRequestUrl(endpoint, path), init);
  }
  function service(provider) {
    const normalized = String(provider ?? "").trim();
    if (!normalized) throw new TypeError("provider is required");
    return { request: (path, init) => request(normalized, path, init) };
  }
  return {
    service,
    dynamic: (slug) => service(`dyn:${String(slug ?? "").trim()}`),
    ...createBuiltInServices({
      publicId,
      request,
      publicRequest,
      createError: (message, status, response) => new WeaveFoxServiceError(message, { status, response })
    })
  };
}
function resolveRequestUrl(endpoint, path) {
  const value = String(path ?? "");
  if (!value.startsWith("/")) throw new TypeError("service path must start with /");
  return `${endpoint}${value}`;
}
async function responseError(response, fallback) {
  let message = fallback;
  try {
    const body = await response.clone().json();
    message = body?.message || body?.error || fallback;
  } catch {
  }
  return new WeaveFoxServiceError(message, { status: response.status, response });
}

// src/appbase-auth.js
var OAUTH_STATE_KEY = "wf.appbase.oauth.state";
var OAUTH_CALLBACK_KEYS = ["userId", "secret", "state", "error", "error_description"];
var AppbaseAuthError = class extends Error {
  constructor(message, { cause, code } = {}) {
    super(message);
    this.name = "AppbaseAuthError";
    this.code = code;
    this.cause = cause;
  }
};
var AppbaseAuthRequiredError = class extends AppbaseAuthError {
  constructor(message = "AppBase login is required") {
    super(message);
    this.name = "AppbaseAuthRequiredError";
    this.code = "AUTH_REQUIRED";
  }
};
var AppbaseOAuthStateError = class extends AppbaseAuthError {
  constructor(message = "Invalid OAuth callback state") {
    super(message);
    this.name = "AppbaseOAuthStateError";
    this.code = "OAUTH_STATE";
  }
};
function createAppbaseAuth({
  account,
  auth
}) {
  if (typeof account?.get !== "function") {
    throw new TypeError("appwrite Account is required");
  }
  const oauthUrl = validateUrl(auth?.oauthUrl, "auth.oauthUrl");
  const clientId = String(auth?.clientId ?? "").trim();
  if (!clientId) throw new TypeError("auth.clientId is required");
  const publicId = String(auth?.publicId ?? "").trim();
  if (!publicId) throw new TypeError("auth.publicId is required");
  const mode = auth?.mode === "oauth" ? "oauth" : "anonymous";
  const storage = auth?.storage ?? globalThis.sessionStorage;
  const location = auth?.location ?? globalThis.location;
  const history = auth?.history ?? globalThis.history;
  const generateState = auth?.generateState ?? (() => {
    const value = globalThis.crypto?.randomUUID?.();
    if (!value) {
      throw new AppbaseAuthError("A random-state generator is required");
    }
    return value;
  });
  function requireStorage() {
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
      throw new TypeError("auth.storage (sessionStorage) is required in a browser");
    }
    return storage;
  }
  function requireLocation() {
    if (!location || typeof location.href !== "string") {
      throw new TypeError("auth.location is required outside a browser");
    }
    return location;
  }
  function currentUrl() {
    const value = requireLocation().href;
    try {
      return new URL(value);
    } catch (cause) {
      throw new AppbaseAuthError("Invalid current URL", { cause });
    }
  }
  function hasCallbackParams(url = currentUrl()) {
    return ["userId", "secret", "state", "error"].some(
      (key) => url.searchParams.has(key)
    );
  }
  function cleanAuthUrl(url = currentUrl()) {
    OAUTH_CALLBACK_KEYS.forEach((key) => url.searchParams.delete(key));
    if (typeof history?.replaceState !== "function") {
      throw new TypeError("auth.history is required outside a browser");
    }
    history.replaceState(null, "", url.href);
    return url;
  }
  function clearState(storageImpl = requireStorage()) {
    storageImpl.removeItem(OAUTH_STATE_KEY);
  }
  function buildLoginUrl({
    redirectUri,
    state
  } = {}) {
    if (!oauthUrl) throw new TypeError("auth.oauthUrl is required");
    if (!clientId) throw new TypeError("auth.clientId is required");
    const redirect = redirectUri ? new URL(redirectUri) : currentUrl();
    OAUTH_CALLBACK_KEYS.forEach((key) => redirect.searchParams.delete(key));
    redirect.searchParams.set("publicId", publicId);
    const target = new URL(oauthUrl);
    target.searchParams.set("client_id", clientId);
    target.searchParams.set("redirect_uri", redirect.href);
    if (state) target.searchParams.set("state", state);
    return target.href;
  }
  function isAlipayH5() {
    if (auth?.isAlipayH5 !== void 0) return Boolean(auth.isAlipayH5);
    if (typeof window === "undefined") return false;
    return Boolean(
      window.AlipayJSBridge || /AlipayClient/i.test(window.navigator?.userAgent || "")
    );
  }
  function buildAlipayLoginUrl(options = {}) {
    const validProviders = ["auto", "weavefox", "alipay"];
    const provider = options.provider ?? "auto";
    if (!validProviders.includes(provider)) {
      throw new TypeError("provider must be one of 'auto', 'weavefox', or 'alipay'");
    }
    const oauthLoginUrl = buildLoginUrl(options);
    if (provider === "weavefox") return oauthLoginUrl;
    if (provider === "auto" && !isAlipayH5()) {
      return oauthLoginUrl;
    }
    const socialLoginUrl = new URL("/api/auth/alipay", oauthUrl);
    socialLoginUrl.searchParams.set("redirect", oauthLoginUrl);
    return socialLoginUrl.href;
  }
  async function loginWithWeaveFox({
    provider,
    redirectUri,
    state = generateState()
  } = {}) {
    const stateStorage = requireStorage();
    const loginUrl = buildAlipayLoginUrl({ provider, redirectUri, state });
    stateStorage.setItem(OAUTH_STATE_KEY, state);
    const locationImpl = requireLocation();
    if (typeof locationImpl.assign === "function") {
      locationImpl.assign(loginUrl);
    } else {
      locationImpl.href = loginUrl;
    }
    return void 0;
  }
  function loginWithAlipayH5(options = {}) {
    return loginWithWeaveFox({ ...options, provider: "alipay" });
  }
  async function handleCallback() {
    const url = currentUrl();
    const oauthError = url.searchParams.get("error");
    if (!hasCallbackParams(url)) {
      return null;
    }
    const storageImpl = requireStorage();
    let expectedState;
    try {
      expectedState = storageImpl.getItem(OAUTH_STATE_KEY);
    } finally {
      clearState(storageImpl);
    }
    const state = url.searchParams.get("state");
    const userId = url.searchParams.get("userId");
    const secret = url.searchParams.get("secret");
    try {
      if (oauthError) {
        const description = url.searchParams.get("error_description");
        throw new AppbaseAuthError(description || `${oauthError} OAuth failure`);
      }
      if (!expectedState || !state || state !== expectedState) {
        throw new AppbaseOAuthStateError();
      }
      if (!userId || !secret) {
        throw new AppbaseAuthError("OAuth callback is missing userId or secret");
      }
      await account.createSession(userId, secret);
      return await account.get();
    } finally {
      cleanAuthUrl(url);
    }
  }
  async function getUser() {
    const callbackUser = await handleCallback();
    if (callbackUser) return callbackUser;
    try {
      return await account.get();
    } catch (error) {
      if (error?.code === 401) return null;
      throw error;
    }
  }
  async function requireUser({ login = false, redirectUri } = {}) {
    const user = await getUser();
    if (user) return user;
    if (login) {
      await loginWithWeaveFox({ redirectUri });
      return null;
    }
    throw new AppbaseAuthRequiredError();
  }
  async function logout() {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch (error) {
      if (error?.code !== 401) throw error;
    }
    return true;
  }
  return {
    mode,
    oauthUrl,
    clientId,
    publicId,
    buildLoginUrl,
    buildAlipayLoginUrl,
    loginWithWeaveFox,
    loginWithAlipayH5,
    isAlipayH5,
    handleCallback,
    getUser,
    requireUser,
    logout,
    isCallback: () => {
      try {
        return hasCallbackParams();
      } catch {
        return false;
      }
    },
    errors: {
      AuthError: AppbaseAuthError,
      AuthRequiredError: AppbaseAuthRequiredError,
      OAuthStateError: AppbaseOAuthStateError
    }
  };
}
function validateUrl(value, label) {
  const raw = String(value ?? "").trim();
  if (!raw) throw new TypeError(`${label} is required`);
  try {
    return new URL(raw).href;
  } catch (cause) {
    throw new TypeError(`${label} must be a valid URL`, { cause });
  }
}

// src/appbase.js
function createAppbaseClient(options) {
  const endpoint = String(options?.endpoint ?? "").trim().replace(/\/+$/, "");
  if (!endpoint) throw new TypeError("endpoint is required");
  const projectId = String(options?.projectId ?? "").trim();
  if (!projectId) throw new TypeError("projectId is required");
  const databaseId = String(options?.databaseId ?? "").trim();
  if (!databaseId) throw new TypeError("databaseId is required");
  const appwrite = options?.appwrite;
  if (!appwrite) throw new TypeError("appwrite SDK is required");
  const { Client, Account, TablesDB, ID, Permission, Role, Query } = appwrite;
  if (typeof Client !== "function" || typeof Account !== "function" || typeof TablesDB !== "function" || typeof ID?.unique !== "function" || typeof Permission?.read !== "function" || typeof Role?.user !== "function" || typeof Query?.limit !== "function") {
    throw new TypeError(
      "appwrite must provide Client, Account, TablesDB, ID, Permission, Role, and Query"
    );
  }
  const client = new Client().setEndpoint(endpoint).setProject(projectId);
  const account = new Account(client);
  const tables = new TablesDB(client);
  const auth = options?.auth ? createAppbaseAuth({ account, auth: options.auth }) : null;
  let pendingAccount;
  async function ensureAccount() {
    pendingAccount || (pendingAccount = (async () => {
      if (auth?.mode === "oauth") {
        const user = await auth.getUser();
        if (!user) throw new AppbaseAuthRequiredError();
        return user;
      }
      try {
        return await account.get();
      } catch (error) {
        if (error?.code !== 401) throw error;
        await account.createAnonymousSession();
        return account.get();
      }
    })().finally(() => {
      pendingAccount = void 0;
    }));
    return pendingAccount;
  }
  async function createRecord(tableId, data, identity = null) {
    const user = identity ?? await ensureAccount();
    const owner = Role.user(user.$id);
    return tables.createRow({
      databaseId,
      tableId: validateTableId(tableId),
      rowId: ID.unique(),
      data: data ?? {},
      permissions: [Permission.read(owner), Permission.update(owner), Permission.delete(owner)]
    });
  }
  async function listRecords(tableId, { queries: filters = [], limit = 25, offset = 0 } = {}) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError("limit must be a positive integer");
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new RangeError("offset must be a non-negative integer");
    }
    await ensureAccount();
    return tables.listRows({
      databaseId,
      tableId: validateTableId(tableId),
      queries: [...filters, Query.limit(limit), Query.offset(offset)]
    });
  }
  async function getRecord(tableId, rowId) {
    if (!rowId) throw new TypeError("rowId is required");
    await ensureAccount();
    return tables.getRow({
      databaseId,
      tableId: validateTableId(tableId),
      rowId
    });
  }
  async function updateRecord(tableId, rowId, data) {
    if (!rowId) throw new TypeError("rowId is required");
    await ensureAccount();
    return tables.updateRow({
      databaseId,
      tableId: validateTableId(tableId),
      rowId,
      data: data ?? {}
    });
  }
  async function deleteRecord(tableId, rowId) {
    if (!rowId) throw new TypeError("rowId is required");
    await ensureAccount();
    return tables.deleteRow({
      databaseId,
      tableId: validateTableId(tableId),
      rowId
    });
  }
  function table(tableId) {
    return {
      create: (data) => createRecord(tableId, data),
      list: (options2) => listRecords(tableId, options2),
      get: (rowId) => getRecord(tableId, rowId),
      update: (rowId, data) => updateRecord(tableId, rowId, data),
      remove: (rowId) => deleteRecord(tableId, rowId),
      verify: (sample) => verifyReadWrite(tableId, sample)
    };
  }
  async function verifyReadWrite(tableId, sample) {
    const row = await createRecord(tableId, sample);
    try {
      const saved = await getRecord(tableId, row.$id);
      if (Object.entries(sample ?? {}).some(
        ([key, value]) => JSON.stringify(saved[key]) !== JSON.stringify(value)
      )) {
        throw new Error("AppBase read-back mismatch");
      }
      await updateRecord(tableId, row.$id, sample);
      return { verified: true, operations: ["create", "read", "update", "delete"] };
    } finally {
      await deleteRecord(tableId, row.$id).catch(() => void 0);
    }
  }
  return {
    client,
    account,
    tables,
    config: { endpoint, projectId, databaseId },
    auth,
    ensureAccount,
    createRecord,
    listRecords,
    getRecord,
    updateRecord,
    deleteRecord,
    table,
    verifyReadWrite
  };
}
function validateTableId(value) {
  const tableId = String(value ?? "").trim();
  if (!/^[a-z][a-z0-9_]{0,31}$/.test(tableId)) {
    throw new TypeError("tableId must match /^[a-z][a-z0-9_]{0,31}$/");
  }
  return tableId;
}
export {
  AppbaseAuthError,
  AppbaseAuthRequiredError,
  AppbaseOAuthStateError,
  WeaveFoxServiceError,
  createAppbaseClient,
  createWeaveFoxClient
};
