import { useState } from "react";
import { ArrowLeft, Plus, MapPin, Phone, Edit, Trash2, Check } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  detail: string;
  isDefault: boolean;
}

export default function Addresses() {
  const { t } = useLanguage();
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: "1",
      name: "Иван Петров",
      phone: "+7 (999) ***-**-88",
      address: "Тверская улица 12, Москва",
      detail: "Корпус А, офис 1001",
      isDefault: true
    },
    {
      id: "2",
      name: "Анна Сидорова",
      phone: "+7 (999) ***-**-99",
      address: "Красная площадь 5, Москва",
      detail: "Корпус Б, офис 2002",
      isDefault: false
    }
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    detail: "",
    isDefault: false
  });

  const handleSetDefault = (id: string) => {
    setAddresses(addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id
    })));
    toast.success(t("pages_addresses_已设为默认"));
  };

  const handleDelete = (id: string) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
    toast.success(t("pages_addresses_地址已删除"));
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      name: address.name,
      phone: address.phone,
      address: address.address,
      detail: address.detail,
      isDefault: address.isDefault
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    setFormData({
      name: "",
      phone: "",
      address: "",
      detail: "",
      isDefault: false
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.phone || !formData.address) {
      toast.error(t("pages_addresses_请填写完整信息"));
      return;
    }

    if (editingAddress) {
      setAddresses(addresses.map(addr =>
        addr.id === editingAddress.id
          ? { ...addr, ...formData }
          : addr
      ));
      toast.success(t("pages_addresses_地址已更新"));
    } else {
      const newAddress: Address = {
        id: Date.now().toString(),
        ...formData
      };
      setAddresses([...addresses, newAddress]);
      toast.success(t("pages_addresses_地址已添加"));
    }

    setIsDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link href="/profile">
          <ArrowLeft size={24} className="text-foreground cursor-pointer" />
        </Link>
        <h1 className="font-bold text-lg">{t("pages_addresses_我的地址")}</h1>
      </div>

      <div className="p-4 space-y-3">
        {addresses.map((address) => (
          <div
            key={address.id}
            className="bg-white rounded-xl p-4 shadow-sm relative"
          >
            {address.isDefault && (
              <div className="absolute top-0 right-0 bg-primary text-white text-xs px-3 py-1 rounded-bl-xl rounded-tr-xl">
                {t("pages_addresses_默认")}
              </div>
            )}

            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-base">{address.name}</span>
                  <span className="text-sm text-muted-foreground">{address.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{address.address} {address.detail}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              {!address.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleSetDefault(address.id)}
                >
                  <Check size={14} className="mr-1" />
                  {t("pages_addresses_设为默认")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleEdit(address)}
              >
                <Edit size={14} className="mr-1" />
                {t("pages_addresses_编辑")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-red-500 hover:text-red-600"
                onClick={() => handleDelete(address.id)}
              >
                <Trash2 size={14} className="mr-1" />
                {t("pages_addresses_删除")}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-6 left-0 right-0 px-4">
        <Button
          onClick={handleAddNew}
          className="w-full bg-primary hover:bg-primary/90 text-white py-6 rounded-full shadow-lg flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          <span className="font-bold">{t("pages_addresses_添加新地址")}</span>
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAddress ? t("pages_addresses_编辑地址") : t("pages_addresses_添加新地址")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("pages_addresses_收货人")}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("pages_addresses_请输入姓名")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("pages_addresses_手机号码")}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t("pages_addresses_请输入手机号")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("pages_addresses_所在地区")}</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t("pages_addresses_城市街道")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("pages_addresses_详细地址")}</label>
              <textarea
                value={formData.detail}
                onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                placeholder={t("pages_addresses_楼栋号门牌号")}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="isDefault" className="text-sm">{t("pages_addresses_设为默认地址")}</label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsDialogOpen(false)}
            >
              {t("pages_addresses_取消")}
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handleSave}
            >
              {t("pages_addresses_保存")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
