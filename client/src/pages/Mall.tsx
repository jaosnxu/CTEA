import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
}

export default function Mall() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        // Filter for "Mall" category items or simulate if none exist
        const mallItems = data.filter((p: Product) => p.category === "Mall" || p.category === "Merch");
        
        // If no mall items in mock DB, use some fallbacks for display
        if (mallItems.length === 0) {
          setProducts([
            {
              id: 101,
              name: "CHU Tote Bag",
              price: 1299,
              category: "Merch",
              image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
              description: "Limited edition canvas tote"
            },
            {
              id: 102,
              name: "Glass Tumbler",
              price: 899,
              category: "Merch",
              image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
              description: "Double-walled glass bottle"
            },
            {
              id: 103,
              name: "Tea Gift Set",
              price: 2599,
              category: "Gift",
              image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80",
              description: "Premium loose leaf selection"
            },
            {
              id: 104,
              name: "Plush Mascot",
              price: 1599,
              category: "Toy",
              image: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?auto=format&fit=crop&w=800&q=80",
              description: "Cute tea cup plushie"
            }
          ]);
        } else {
          setProducts(mallItems);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch mall products:", err);
        setLoading(false);
      });
  }, []);

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
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm border-none text-white">
                  New
                </Badge>
              </div>
              <CardContent className="p-3">
                <h3 className="font-bold text-gray-900 line-clamp-1">{product.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
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
