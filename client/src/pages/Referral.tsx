import { useState } from "react";
import { ArrowLeft, Copy, Check, Gift, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import ShareModal from "@/components/ShareModal";
import { formatCurrency } from "@/lib/i18n";

export default function Referral() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Generate user referral code (should be fetched from backend in production)
  const referralCode = "CHUTEA2026";
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;
  
  // Referral statistics
  const referralStats = {
    totalInvited: 12,
    successfulOrders: 8,
    earnedCoupons: 4
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success(t("pages_referral_code_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(t("pages_referral_copy_failed"));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => setLocation("/profile")}
          className="text-white"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg text-white">{t("pages_referral_title")}</h1>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 px-4 pb-8 pt-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center text-white">
          <Gift size={48} className="mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-2">{t("pages_referral_hero_title")}</h2>
          <p className="text-sm text-white/90">
            {t("pages_referral_hero_desc", { amount: formatCurrency(10) })}
          </p>
        </div>
      </div>

      {/* Referral Code Card */}
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-center mb-4">{t("pages_referral_my_code")}</h3>
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary tracking-wider mb-2">
                {referralCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm hover:bg-primary/90 transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    {t("pages_referral_copied")}
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    {t("pages_referral_copy_code")}
                  </>
                )}
              </button>
            </div>
          </div>
          
          <Button
            onClick={() => setShowShareModal(true)}
            className="w-full bg-primary hover:bg-primary/90 text-white"
          >
            {t("pages_referral_share_friends")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold mb-4">{t("pages_referral_stats_title")}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <Users size={24} className="text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-primary">{referralStats.totalInvited}</div>
              <div className="text-xs text-gray-600 mt-1">{t("pages_referral_invited")}</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <TrendingUp size={24} className="text-green-600" />
              </div>
              <div className="text-2xl font-bold text-primary">{referralStats.successfulOrders}</div>
              <div className="text-xs text-gray-600 mt-1">{t("pages_referral_successful_orders")}</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                <Gift size={24} className="text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-primary">{referralStats.earnedCoupons}</div>
              <div className="text-xs text-gray-600 mt-1">{t("pages_referral_earned_coupons")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold mb-4">{t("pages_referral_how_it_works")}</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm mb-1">{t("pages_referral_step1_title")}</h4>
                <p className="text-xs text-gray-600">
                  {t("pages_referral_step1_desc")}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm mb-1">{t("pages_referral_step2_title")}</h4>
                <p className="text-xs text-gray-600">
                  {t("pages_referral_step2_desc")}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm mb-1">{t("pages_referral_step3_title")}</h4>
                <p className="text-xs text-gray-600">
                  {t("pages_referral_step3_desc", { amount: formatCurrency(10) })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className="px-4 mt-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-bold text-sm mb-2">{t("pages_referral_rules_title")}</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• {t("pages_referral_rule1", { amount: formatCurrency(10) })}</li>
            <li>• {t("pages_referral_rule2", { days: 30, minAmount: formatCurrency(30) })}</li>
            <li>• {t("pages_referral_rule3")}</li>
            <li>• {t("pages_referral_rule4")}</li>
            <li>• {t("pages_referral_rule5")}</li>
          </ul>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={t("pages_referral_share_title")}
        description={t("pages_referral_share_desc", { code: referralCode, amount: formatCurrency(10) })}
        imageUrl="/images/logo.png"
        shareUrl={referralLink}
      />
    </div>
  );
}
