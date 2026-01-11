import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, Star, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
}

export default function ReviewModal({ open, onClose, orderId }: ReviewModalProps) {
  const { t } = useLanguage();
  const { addReview } = useApp();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [hoveredStar, setHoveredStar] = useState(0);

  if (!open) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setVideos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Пожалуйста, выберите оценку");
      return;
    }
    addReview(orderId, rating, comment, images);
    
    // 计算积分奖励
    let points = 10; // 基础积分
    if (comment.length > 20) points += 10; // 详细评价
    if (images.length > 0) points += 5 * images.length; // 图片奖励
    if (videos.length > 0) points += 20 * videos.length; // 视频奖励
    
    toast.success(`Отзыв отправлен! Вы получили ${points} баллов`);
    onClose();
    setRating(5);
    setComment("");
    setImages([]);
    setVideos([]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">评价订单</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">您对本次服务的评价</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={36}
                    className={`${
                      star <= (hoveredStar || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {rating === 5 && "Отлично"}
              {rating === 4 && "Хорошо"}
              {rating === 3 && "Нормально"}
              {rating === 2 && "Плохо"}
              {rating === 1 && "Очень плохо"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">评价内容（选填）</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Поделитесь вашим опытом, помогите нам стать лучше..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">上传图片（选填）</label>
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={img} alt={`Фото отзыва ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {images.length < 4 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors">
                  <Upload size={20} className="text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">上传</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">最多上传4张图片，每张图片+5积分</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">上传视频（选填）</label>
            <div className="grid grid-cols-2 gap-3">
              {videos.map((video, index) => (
                <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <video src={video} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeVideo(index)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {videos.length < 2 && (
                <label className="aspect-video rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors">
                  <Upload size={20} className="text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">上传视频</span>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">最多上传2个视频，每个视频+20积分</p>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-200">
            <h3 className="text-sm font-bold text-orange-900 mb-2">🎁 积分奖励规则</h3>
            <ul className="text-xs text-orange-800 space-y-1">
              <li>• 基础评价：+10积分</li>
              <li>• 详细评价（20字以上）：+10积分</li>
              <li>• 上传图片：每张+5积分</li>
              <li>• 上传视频：每个+20积分</li>
            </ul>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <Button 
            onClick={handleSubmit}
            className="w-full h-12 text-base font-medium"
          >
            提交评价
          </Button>
        </div>
      </div>
    </div>
  );
}
