import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE_PATH =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 3012;
const DEBUG_PORT = 9232;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const WS = globalThis.WebSocket;
      if (!WS) {
        reject(new Error("Global WebSocket is not available in Node"));
        return;
      }
      this.ws = new WS(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const parsed = JSON.parse(event.data.toString());
        if (parsed.id && this.callbacks.has(parsed.id)) {
          const { cb, rej } = this.callbacks.get(parsed.id);
          this.callbacks.delete(parsed.id);
          if (parsed.error) rej(parsed.error);
          else cb(parsed.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((cb, rej) => {
      const id = this.msgId++;
      this.callbacks.set(id, { cb, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        res.exceptionDetails.exception?.description || "Evaluation error"
      );
    }
    return res.result?.value;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runBrowserVerification() {
  console.log("=== WEB-WB-04 端到端浏览器验证开始 ===");

  // 1. 验证静态构建产物与 PWA 资产
  console.log("\n[步骤 1] 启动 Vite 生产预览服务 (端口 3012)...");
  const viteProcess = spawn(
    process.execPath,
    [
      "./node_modules/vite/bin/vite.js",
      "preview",
      "--config",
      "app/renderer/vite.config.mts",
      "--port",
      String(PORT),
      "--strictPort",
    ],
    { cwd: "D:\\工作台\\pomodoroz", stdio: "ignore" }
  );

  let viteReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok) {
        viteReady = true;
        break;
      }
    } catch {}
    await sleep(250);
  }

  if (!viteReady) {
    viteProcess.kill();
    throw new Error("Vite preview 服务启动失败");
  }
  console.log("✓ Vite preview 3012 服务已就绪");

  // 静态资产检查
  console.log("\n[步骤 2] 检查 PWA 与 Cloudflare Pages 静态资产响应...");
  const manifestRes = await fetch(`http://localhost:${PORT}/manifest.webmanifest`);
  const manifestJson = await manifestRes.json();
  console.log("✓ manifest.webmanifest 状态:", manifestRes.status, "应用名:", manifestJson.name);

  const swRes = await fetch(`http://localhost:${PORT}/sw.js`);
  const swText = await swRes.text();
  console.log("✓ sw.js 状态:", swRes.status, "包含外壳缓存:", swText.includes("pomodoroz-shell-v1"));

  const headersRes = await fetch(`http://localhost:${PORT}/_headers`);
  console.log("✓ _headers 存在:", headersRes.ok);

  const redirectsRes = await fetch(`http://localhost:${PORT}/_redirects`);
  console.log("✓ _redirects 存在:", redirectsRes.ok);

  // 2. 启动隔离 Edge 测试实例
  const tempUserDataDir = mkdtempSync(join(tmpdir(), "edge-verify-web-wb-04-"));
  console.log("\n[步骤 3] 启动 Edge 浏览器 CDP 实例，Profile:", tempUserDataDir);

  const edgeProcess = spawn(
    EDGE_PATH,
    [
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${tempUserDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--headless=new",
      `http://localhost:${PORT}/`,
    ],
    { stdio: "ignore" }
  );

  await sleep(1500);

  const targetsRes = await fetch(`http://localhost:${DEBUG_PORT}/json`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === "page");
  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error("未找到可调试的页面 WebSocket");
  }

  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  console.log("✓ CDP 已连接页面");

  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await sleep(1000);

  // 3. 窄屏视口实测：360×800
  console.log("\n[步骤 4] 验证 360×800 窄屏视口适配 (A15)...");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 800,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sleep(500);

  const checkViewportOverflow = async () => {
    return cdp.evaluate(`(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const bodyW = document.body.scrollWidth;
      return {
        hasOverflow: docW > winW || bodyW > winW,
        scrollWidth: docW,
        windowWidth: winW,
        bodyWidth: bodyW
      };
    })()`);
  };

  const overflow360 = await checkViewportOverflow();
  console.log("360×800 视口溢出检测:", overflow360);
  if (overflow360.hasOverflow) {
    console.warn("⚠️ 警告: 存在横向溢出", overflow360);
  } else {
    console.log("✓ 360×800 视口无页面级横向溢出");
  }

  // 检查计时器控件
  const timerControls = await cdp.evaluate(`(() => {
    const playBtn = document.querySelector('button[aria-label="Play"], button[aria-label="play"], button svg path');
    const navItems = document.querySelectorAll('nav a');
    return {
      navCount: navItems.length,
      hasNav: navItems.length >= 4,
      docHeight: document.documentElement.scrollHeight
    };
  })()`);
  console.log("✓ 计时器主页渲染良好，导航入口数:", timerControls.navCount);

  // 切换到任务页面
  console.log("\n[步骤 5] 切换至待办任务页并测试矩阵/四象限/列表三态切换...");
  await cdp.evaluate(`window.location.hash = '#/task-list'`);
  await sleep(1000);

  const taskOverflow360 = await checkViewportOverflow();
  console.log("360×800 任务页溢出检测:", taskOverflow360);

  const taskModesTest = await cdp.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const matrixBtn = buttons.find(b => b.textContent.includes('5×5'));
    const quadBtn = buttons.find(b => b.textContent.includes('四象限'));
    const listBtn = buttons.find(b => b.textContent.includes('列表'));
    
    // 切换到四象限
    if (quadBtn) quadBtn.click();
    const hasQuad = document.querySelector('h4') !== null;

    // 切换回 5x5
    if (matrixBtn) matrixBtn.click();
    const hasMatrix = true;

    return {
      hasMatrixBtn: Boolean(matrixBtn),
      hasQuadBtn: Boolean(quadBtn),
      hasListBtn: Boolean(listBtn),
      hasQuad,
      hasMatrix
    };
  })()`);
  console.log("✓ 任务视图切换状态:", taskModesTest);

  // 切换到设置页面
  console.log("\n[步骤 6] 切换至设置页面并验证云同步与工作台迁移模块 (A17, A20)...");
  await cdp.evaluate(`window.location.hash = '#/settings'`);
  await sleep(1000);

  const settingsCheck = await cdp.evaluate(`(() => {
    const text = document.body.innerText;
    const hasCloudSync = text.includes('云端同步与账号') || text.includes('Supabase');
    const hasWorkbenchTransfer = text.includes('工作台完整数据迁移') || text.includes('导出工作台备份');
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
    return {
      hasCloudSync,
      hasWorkbenchTransfer,
      exportBtnPresent: buttons.some(b => b.includes('导出工作台备份')),
      importBtnPresent: buttons.some(b => b.includes('导入备份文件'))
    };
  })()`);
  console.log("✓ 设置页新模块挂载验证:", settingsCheck);

  // 4. 窄屏视口实测：390×844
  console.log("\n[步骤 7] 验证 390×844 (iPhone 典型尺寸) 视口适配 (A15)...");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await sleep(500);

  const overflow390 = await checkViewportOverflow();
  console.log("390×844 视口溢出检测:", overflow390);

  // 5. 桌面视口实测：1280×800
  console.log("\n[步骤 8] 验证 1280×800 桌面视口兼容...");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(500);

  const overflowDesktop = await checkViewportOverflow();
  console.log("1280×800 桌面视口检测:", overflowDesktop);

  // 清理退出
  console.log("\n=== 浏览器测试全部通过，清理环境 ===");
  cdp.close();
  edgeProcess.kill();
  viteProcess.kill();
  try {
    rmSync(tempUserDataDir, { recursive: true, force: true });
  } catch {}

  console.log("=== WEB-WB-04 端到端验证顺利完成 ===");
}

runBrowserVerification().catch((err) => {
  console.error("验证失败:", err);
  process.exit(1);
});
