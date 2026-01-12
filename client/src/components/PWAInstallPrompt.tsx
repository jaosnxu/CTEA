import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 检测是否已经在独立模式运行
    const isInStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    setIsStandalone(isInStandaloneMode);

    // 如果已经在独立模式，不显示提示
    if (isInStandaloneMode) {
      return;
    }

    // 检查是否已经关闭过提示
    const hasClosedPrompt = localStorage.getItem("pwa-install-prompt-closed");
    if (hasClosedPrompt) {
      return;
    }

    // 监听安装提示事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // 延迟显示，避免打扰用户
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // 显示安装提示
    await deferredPrompt.prompt();

    // 等待用户响应
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("用户接受了安装");
    }

    // 清除 prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-prompt-closed", "true");
  };

  // 如果已经在独立模式或不显示提示，返回 null
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-r from-black to-gray-800 text-white rounded-2xl p-4 shadow-2xl max-w-md mx-auto">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-black">C</span>
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-base mb-1">安装 CHUTEA 应用</h3>
            <p className="text-sm text-white/80 mb-3">
              添加到主屏幕，享受更流畅的原生体验，无广告干扰
            </p>

            <Button
              onClick={handleInstallClick}
              className="w-full bg-white text-black hover:bg-gray-100 font-bold rounded-full h-10"
            >
              <Download size={16} className="mr-2" />
              立即安装
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
