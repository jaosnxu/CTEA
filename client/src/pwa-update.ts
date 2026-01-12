// PWA 自动更新检测
// 只在生产环境启用
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(registration => {
      console.log("[PWA] Service Worker 已注册");

      // 每 5 秒检查一次更新
      setInterval(() => {
        console.log("[PWA] 检查更新...");
        registration.update();
      }, 5000);

      // 监听新版本
      registration.addEventListener("updatefound", () => {
        console.log("[PWA] 发现新版本！");
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "activated" &&
              !navigator.serviceWorker.controller
            ) {
              console.log("[PWA] 新版本已激活，立即刷新...");
              // 立即刷新
              window.location.reload();
            }
          });
        }
      });

      // 监听控制器变化（Service Worker 更新）
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("[PWA] Service Worker 已更新，刷新页面...");
        window.location.reload();
      });
    })
    .catch(err => {
      console.error("[PWA] Service Worker 注册失败:", err);
    });
}
