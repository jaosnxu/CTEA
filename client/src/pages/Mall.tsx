import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

interface Product {
  id: number;
  name_zh: string;
  name_en: string;
  name_ru: string;
  description_zh: string;
  description_en: string;
  description_ru: string;
  price: number;
  category: string;
  image: string;
}

export default function Mall() {
  const { t } = useTranslation();
  
  // tRPC Query with auto-revalidation
  const { data: allProducts = [], isLoading: loading } = trpc.products.list.useQuery();
  
  // Filter mall products
  const products = useMemo(() => {
    return allProducts.filter((p: any) => p.category === "mall");
  }, [allProducts]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 px-4 py-3 shadow-sm">
        <h1 className="text-lg font-bold text-center">{t("nav.mall")}</h1>
      </div>

      {/* Banner */}
      <div className="p-4">
        <div className="relative h-40 rounded-2xl overflow-hidden bg-gray-900">
          <img 
            src="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1600&q=80" 
            alt="Mall Banner" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 flex flex-col justify-center px-6">
            <h2 className="text-2xl font-bold text-white mb-1">CHU Lifestyle</h2>
            <p className="text-white/80 text-sm">Exclusive merchandise & gifts</p>
          </div>
        </div>
      </div>

      {/* Waterfall Grid */}
      <div className="px-4 grid grid-cols-2 gap-4">
        {loading ? (
          // Skeleton loading
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
          ))
        ) : (
          products.map((product) => (
            <Card key={product.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-[3/4] relative bg-gray-100">
                <img 
                  src={product.image} 
                  alt={product.name_ru}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm border-none text-white">
                  New
                </Badge>
              </div>
              <CardContent className="p-3">
                <h3 className="font-bold text-gray-900 line-clamp-1">{product.name_ru}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description_ru}</p>
              </CardContent>
              <CardFooter className="p-3 pt-0 flex items-center justify-between">
                <span className="font-bold text-lg">₽{product.price}</span>
                <Button size="icon" className="h-8 w-8 rounded-full bg-black hover:bg-gray-800">
                  <ShoppingBag className="w-4 h-4 text-white" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
