import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Minus, Search, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data
const CATEGORIES = [
  { id: "seasonal", name: "Seasonal", icon: "🍓" },
  { id: "top", name: "Top Picks", icon: "🔥" },
  { id: "milktea", name: "Milk Tea", icon: "🧋" },
  { id: "fruit", name: "Fruit Tea", icon: "🍋" },
  { id: "pure", name: "Pure Tea", icon: "🍵" },
  { id: "coffee", name: "Coffee", icon: "☕" },
  { id: "bakery", name: "Bakery", icon: "🥐" },
];

const PRODUCTS = [
  {
    id: 1,
    category: "seasonal",
    name: "Very Grape Cheezo",
    description: "Selected premium grapes, hand-peeled daily. Paired with signature Cheezo.",
    price: 29,
    image: "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?q=80&w=2070&auto=format&fit=crop",
    tags: ["New", "Grape"]
  },
  {
    id: 2,
    category: "seasonal",
    name: "Very Mango Grapefruit",
    description: "Fresh mango blended with ice, topped with ruby grapefruit pulp and sago.",
    price: 25,
    image: "https://images.unsplash.com/photo-1546173159-315724a31696?q=80&w=1974&auto=format&fit=crop",
    tags: ["Best Seller"]
  },
  {
    id: 3,
    category: "milktea",
    name: "Roasted Brown Sugar Boba Milk",
    description: "Slow-cooked brown sugar boba with fresh milk and roasted cheese foam.",
    price: 28,
    image: "https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?q=80&w=2070&auto=format&fit=crop",
    tags: []
  },
  {
    id: 4,
    category: "milktea",
    name: "Original Cheezo Tea",
    description: "Classic tea base topped with our signature salty cream cheese foam.",
    price: 22,
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=2070&auto=format&fit=crop",
    tags: []
  }
];

export default function Order() {
  const [activeCategory, setActiveCategory] = useState("seasonal");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [cart, setCart] = useState<{id: number, quantity: number, price: number}[]>([]);

  const addToCart = (product: any) => {
    setCart([...cart, { id: product.id, quantity: 1, price: product.price }]);
    setSelectedProduct(null);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-border flex items-center gap-3 z-20">
        <div className="flex-1 bg-secondary rounded-full h-9 flex items-center px-3 gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Search drinks...</span>
        </div>
        <div className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded-full text-xs font-medium">
          <span>Pickup</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Categories */}
        <div className="w-[85px] bg-secondary h-full overflow-y-auto no-scrollbar pb-32">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex flex-col items-center justify-center py-5 px-1 cursor-pointer transition-colors relative",
                activeCategory === cat.id ? "bg-white text-foreground font-medium" : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              <span className="text-xl mb-1">{cat.icon}</span>
              <span className="text-[10px] text-center leading-tight">{cat.name}</span>
              {activeCategory === cat.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-black rounded-r-full" />
              )}
            </div>
          ))}
        </div>

        {/* Product List */}
        <ScrollArea className="flex-1 bg-white h-full pb-32">
          <div className="p-4">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              {CATEGORIES.find(c => c.id === activeCategory)?.name}
            </h2>
            
            <div className="grid grid-cols-1 gap-6">
              {PRODUCTS.filter(p => p.category === activeCategory || activeCategory === 'top').map((product) => (
                <div key={product.id} className="flex gap-3" onClick={() => setSelectedProduct(product)}>
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <h3 className="font-bold text-base leading-tight mb-1">{product.name}</h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{product.description}</p>
                      <div className="flex gap-1 mt-1.5">
                        {product.tags.map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded border border-red-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="font-bold text-lg">¥{product.price}</span>
                      <Button size="sm" className="h-7 px-3 rounded-full text-xs bg-secondary text-foreground hover:bg-secondary/80 shadow-none border-none">
                        Select
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Spacer for bottom nav */}
              <div className="h-20" />
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Floating Settlement Capsule */}
      {totalItems > 0 && (
        <div className="absolute bottom-20 left-4 right-4 z-30">
          <div className="bg-[#1A1A1A] text-white rounded-full h-14 shadow-xl flex items-center justify-between px-1 pr-1.5 pl-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-none">¥{totalAmount}</span>
                <span className="text-[10px] text-white/60">Free delivery applied</span>
              </div>
            </div>
            <Button className="rounded-full px-6 h-11 bg-white text-black hover:bg-white/90 font-bold">
              Checkout
            </Button>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="w-[92%] max-w-md rounded-[20px] p-0 overflow-hidden border-none bg-white/80 backdrop-blur-xl shadow-2xl gap-0">
          {selectedProduct && (
            <>
              <div className="relative h-64 w-full bg-muted">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-3 right-3 bg-black/20 hover:bg-black/30 text-white rounded-full w-8 h-8 backdrop-blur-sm"
                  onClick={() => setSelectedProduct(null)}
                >
                  <span className="sr-only">Close</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </Button>
              </div>
              
              <div className="p-5 pb-24">
                <DialogHeader className="mb-4 text-left">
                  <DialogTitle className="text-xl font-bold mb-1">{selectedProduct.name}</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                    {selectedProduct.description}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wider">Size</h4>
                    <div className="flex gap-2">
                      <Button variant="outline" className="rounded-xl h-9 text-xs border-primary bg-primary/5 text-primary font-medium">Regular (500ml)</Button>
                      <Button variant="outline" className="rounded-xl h-9 text-xs border-border text-muted-foreground font-normal">Large (700ml)</Button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wider">Sugar</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-xl h-9 text-xs border-primary bg-primary/5 text-primary font-medium">Standard</Button>
                      <Button variant="outline" className="rounded-xl h-9 text-xs border-border text-muted-foreground font-normal">Less (70%)</Button>
                      <Button variant="outline" className="rounded-xl h-9 text-xs border-border text-muted-foreground font-normal">Half (50%)</Button>
                      <Button variant="outline" className="rounded-xl h-9 text-xs border-border text-muted-foreground font-normal">None (0%)</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer - Fixed Bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-border/50 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xl font-bold">¥{selectedProduct.price}</span>
                  <span className="text-[10px] text-muted-foreground">Base price</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-secondary rounded-full px-2 h-9">
                    <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full p-0 h-6 w-6">
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-sm font-medium w-4 text-center">1</span>
                    <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full p-0 h-6 w-6">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button className="rounded-full px-6 h-10 font-bold" onClick={() => addToCart(selectedProduct)}>
                    Add to Cart
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
