import { useState } from "react";
import { ArrowLeft, Plus, Gift, Send, CreditCard, Share2 } from "lucide-react";
import { Link } from "wouter";
import { useApp } from "@/contexts/AppContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import TransferGiftCardModal from "@/components/TransferGiftCardModal";
import ShareModal from "@/components/ShareModal";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function GiftCards() {
  const { giftCards, purchaseGiftCard, transferGiftCard } = useApp();
  const { t, language } = useLanguage();
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [purchaseAmount, setPurchaseAmount] = useState<number | null>(null);
  const FIXED_AMOUNTS = [500, 1000, 1500, 2000];
  const [transferTo, setTransferTo] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [shareCardId, setShareCardId] = useState<string>("");
  const [showShareModal, setShowShareModal] = useState(false);

  const activeCards = giftCards.filter(
    c => c.status === "active" && c.balance > 0
  );
  const usedCards = giftCards.filter(
    c => c.status === "used" || c.balance === 0
  );

  const handlePurchase = () => {
    if (!purchaseAmount) {
      toast.error(t("pages_giftcards_请选择金额"));
      return;
    }

    const newCard = purchaseGiftCard(purchaseAmount);
    toast.success(
      `${t("pages_giftcards_成功购买")} ₽${formatCurrency(purchaseAmount)}，${t("pages_giftcards_卡号")}：${newCard.code}`
    );
    setIsPurchaseModalOpen(false);
    setPurchaseAmount(null);
  };

  const handleTransfer = () => {
    if (!transferTo.trim()) {
      toast.error(t("pages_giftcards_请输入接收人"));
      return;
    }

    transferGiftCard(selectedCardId, transferTo, transferMessage);
    toast.success(t("pages_giftcards_转送成功"));
    setIsTransferModalOpen(false);
    setTransferTo("");
    setTransferMessage("");
    setSelectedCardId("");
  };

  const formatDate = (timestamp: number) => {
    const locale =
      language === "ru" ? "ru-RU" : language === "zh" ? "zh-CN" : "en-US";
    return new Date(timestamp).toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-10 border-b">
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <ArrowLeft size={24} className="cursor-pointer" />
            </Link>
            <h1 className="font-bold text-lg">
              {t("pages_giftcards_我的礼品卡")}
            </h1>
          </div>
          <Button
            onClick={() => setIsPurchaseModalOpen(true)}
            size="sm"
            className="gap-1"
          >
            <Plus size={16} />
            {t("pages_giftcards_购买")}
          </Button>
        </div>

        {activeCards.length > 0 && (
          <div className="px-4 py-4">
            <h2 className="text-sm font-bold text-gray-600 mb-3">
              {t("pages_giftcards_可用礼品卡")}
            </h2>
            <div className="space-y-3">
              {activeCards.map(card => (
                <div
                  key={card.id}
                  className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-white shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Gift size={20} />
                        <span className="text-sm font-medium">
                          CHUTEA {t("pages_giftcards_礼品卡")}
                        </span>
                      </div>
                      <p className="text-xs opacity-80">
                        {t("pages_giftcards_卡号")}: {card.code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {formatCurrency(card.balance.toFixed(2))}
                      </p>
                      <p className="text-xs opacity-80">
                        {t("pages_giftcards_余额")}
                      </p>
                    </div>
                  </div>

                  {card.from && (
                    <div className="bg-white/20 rounded-lg p-2 mb-3">
                      <p className="text-xs">
                        {t("pages_giftcards_来自")}: {card.from}
                      </p>
                      {card.message && (
                        <p className="text-xs mt-1 opacity-90">
                          {card.message}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs opacity-80 mb-3">
                    <span>
                      {t("pages_giftcards_购买日期")}:{" "}
                      {formatDate(card.purchasedAt)}
                    </span>
                    <span>
                      {t("pages_giftcards_有效期至")}:{" "}
                      {formatDate(card.expiresAt)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShareCardId(card.id);
                        setShowShareModal(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-white/20 border-white/30 text-white hover:bg-white/30"
                    >
                      <Share2 size={14} className="mr-1" />
                      {t("pages_giftcards_分享")}
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedCardId(card.id);
                        setIsTransferModalOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-white/20 border-white/30 text-white hover:bg-white/30"
                    >
                      <Send size={14} className="mr-1" />
                      {t("pages_giftcards_转送")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {usedCards.length > 0 && (
          <div className="px-4 py-4">
            <h2 className="text-sm font-bold text-gray-600 mb-3">
              {t("pages_giftcards_已使用")}
            </h2>
            <div className="space-y-3">
              {usedCards.map(card => (
                <div
                  key={card.id}
                  className="bg-white rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">
                        {card.code}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {t("pages_giftcards_已用完")}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {t("pages_giftcards_初始金额")}:{" "}
                    {formatCurrency(card.initialAmount)} ·{" "}
                    {t("pages_giftcards_购买于")} {formatDate(card.purchasedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {giftCards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Gift size={64} className="text-gray-300 mb-4" />
            <p className="text-gray-400 mb-6">
              {t("pages_giftcards_还没有礼品卡")}
            </p>
            <Button onClick={() => setIsPurchaseModalOpen(true)}>
              <Plus size={16} className="mr-1" />
              {t("pages_giftcards_购买礼品卡")}
            </Button>
          </div>
        )}

        <Dialog
          open={isPurchaseModalOpen}
          onOpenChange={setIsPurchaseModalOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("pages_giftcards_购买礼品卡")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Gift size={32} className="text-primary" />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {t("pages_giftcards_可用于购买饮品和商城商品")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("pages_giftcards_选择金额")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {FIXED_AMOUNTS.map(amount => (
                    <button
                      key={amount}
                      onClick={() => setPurchaseAmount(amount)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        purchaseAmount === amount
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-gray-200 hover:border-primary/50"
                      }`}
                    >
                      <div className="text-2xl font-bold text-primary">
                        ₽{amount}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t("pages_giftcards_礼品卡")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsPurchaseModalOpen(false)}
                >
                  {t("pages_giftcards_取消")}
                </Button>
                <Button className="flex-1" onClick={handlePurchase}>
                  {t("pages_giftcards_确认购买")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <TransferGiftCardModal
          open={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          cardId={selectedCardId}
          cardCode={giftCards.find(c => c.id === selectedCardId)?.code || ""}
          balance={giftCards.find(c => c.id === selectedCardId)?.balance || 0}
          onTransfer={(to, message) => {
            transferGiftCard(selectedCardId, to, message);
            toast.success(t("pages_giftcards_转送成功"));
            setIsTransferModalOpen(false);
          }}
        />

        {shareCardId &&
          (() => {
            const card = giftCards.find(c => c.id === shareCardId);
            if (!card) return null;

            return (
              <ShareModal
                open={showShareModal}
                onClose={() => {
                  setShowShareModal(false);
                  setShareCardId("");
                }}
                title={`CHUTEA ${t("pages_giftcards_礼品卡")} ₽${formatCurrency(card.balance)}`}
                description={`${t("pages_giftcards_分享描述")}${card.code}`}
                imageUrl="/images/logo.png"
                shareUrl={`${window.location.origin}/gift-card/claim/${card.code}?ref=share`}
              />
            );
          })()}
      </div>
    </MobileLayout>
  );
}
