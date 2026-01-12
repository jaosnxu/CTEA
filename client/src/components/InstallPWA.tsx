import { Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function InstallPWA() {
  const { isInstalled, canInstall, install } = usePWAInstall();

  const { t } = useLanguage();

  const handleInstall = async () => {
    const result = await install();

    if (result.success) {
      toast.success(t("components_installpwa_应用安装成功"), {
        description: t(
          "components_installpwa_您现在可以从桌面主屏幕打开_CHUTEA_应用了"
        ),
      });
    } else if (result.error === "dismissed") {
      toast.info(t("components_installpwa_已取消安装"));
    } else if (result.error === "no-prompt") {
      toast.error(t("components_installpwa_当前浏览器不支持安装"), {
        description: t(
          "components_installpwa_请使用_ChromeEdge_或_Safari_浏览器"
        ),
      });
    } else {
      toast.error(t("components_installpwa_安装失败请重试"));
    }
  };

  // 如果已安装，显示已安装状态
  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Check size={16} />
        <span className="font-medium">已安装</span>
      </div>
    );
  }

  // 如果可以安装，显示安装按钮
  if (canInstall) {
    return (
      <Button
        onClick={handleInstall}
        variant="outline"
        size="sm"
        className="gap-2 border-primary text-primary hover:bg-primary/5 font-bold"
      >
        <Download size={16} />
        安装应用
      </Button>
    );
  }

  // 不显示任何内容（浏览器不支持或已安装）
  return null;
}
