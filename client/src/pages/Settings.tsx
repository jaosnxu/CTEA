import { useState } from "react";
import { ArrowLeft, LogOut, Trash2, Bell, Shield, ChevronRight, User, Globe } from "lucide-react";
import { Link, useLocation } from "wouter";
import MobileLayout from "@/components/layout/MobileLayout";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Settings() {
  const { userProfile, updateProfile, resetAllData } = useApp();
  const { t, language, setLanguage } = useLanguage();
  const [, setLocation] = useLocation();
  const [name, setName] = useState(userProfile.name);
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveProfile = () => {
    updateProfile({ name });
    setIsEditing(false);
    toast.success(t("pages_settings_个человек资料Уже更新"));
  };

  const handleLogout = () => {
    toast.success(t("pages_settings_Уже退出登录"));
    setLocation("/");
  };

  const languages = [
    { code: "ru", label: "Русский" },
    { code: "zh", label: "中文" },
    { code: "en", label: "English" }
  ];

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <Link href="/profile">
            <ArrowLeft size={24} className="text-foreground cursor-pointer" />
          </Link>
          <h1 className="font-bold text-lg">{t("pages_settings_设置")}</h1>
        </div>

        <div className="p-4 space-y-6">
          {/* Profile Section */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between" onClick={() => setIsEditing(true)}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {userProfile.avatar ? (
                    <img src={userProfile.avatar} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    <User size={24} className="text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{userProfile.name}</h3>
                  <p className="text-xs text-muted-foreground">{userProfile.phone}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300" />
            </div>
          </div>

          {/* Language Switcher */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Globe size={20} className="text-gray-500" />
                <span className="font-medium text-sm">Language / Язык / Язык</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code as "ru" | "zh" | "en")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      language === lang.code
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-gray-500" />
                <span className="font-medium text-sm">{t("pages_settings_消息通知")}</span>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-gray-500" />
                <span className="font-medium text-sm">{t("pages_settings_隐私设置")}</span>
              </div>
              <ChevronRight size={20} className="text-gray-300" />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100 h-12"
              onClick={resetAllData}
            >
              <Trash2 size={18} className="mr-3" /> {t("pages_settings_清除缓存并重置数据")}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start h-12"
              onClick={handleLogout}
            >
              <LogOut size={18} className="mr-3" /> {t("pages_settings_退出登录")}
            </Button>
          </div>
        </div>

        {/* Edit Profile Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="w-[90%] rounded-2xl">
            <DialogHeader>
              <DialogTitle>{t("pages_settings_修改资料")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("pages_settings_昵称")}</label>
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button className="w-full mt-4" onClick={handleSaveProfile}>{t("pages_settings_保存")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
