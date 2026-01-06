import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

interface Product {
  id: number;
  name_zh: string;
  name_en: string;
  name_ru: string;
  price: number;
  category: string;
}

export default function AdminProducts() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditPrice(product.price.toString());
  };

  const handleSave = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: parseInt(editPrice) }),
      });
      
      if (res.ok) {
        setEditingId(null);
        fetchProducts();
      }
    } catch (err) {
      console.error("Failed to update price", err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Product Management (Admin)</h1>
      
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-500">ID</th>
              <th className="p-4 font-medium text-gray-500">Name (RU)</th>
              <th className="p-4 font-medium text-gray-500">Category</th>
              <th className="p-4 font-medium text-gray-500">Price (₽)</th>
              <th className="p-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="p-4 text-gray-500">#{product.id}</td>
                <td className="p-4 font-medium">{product.name_ru}</td>
                <td className="p-4 text-gray-500 capitalize">{product.category}</td>
                <td className="p-4">
                  {editingId === product.id ? (
                    <Input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-24 h-8"
                    />
                  ) : (
                    <span className="font-bold">₽{product.price}</span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === product.id ? (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleSave(product.id)}
                        className="h-8 bg-green-600 hover:bg-green-700"
                      >
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setEditingId(null)}
                        className="h-8"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEdit(product)}
                      className="h-8"
                    >
                      Edit Price
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
