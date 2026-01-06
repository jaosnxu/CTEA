import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Product {
  id: number;
  name_zh: string;
  name_en: string;
  name_ru: string;
  price: number;
  category: string;
  is_manual_override?: boolean;
}

export default function AdminProducts() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");

  // tRPC Query with auto-revalidation
  const { data: products = [], refetch } = trpc.admin.products.list.useQuery();

  // tRPC Mutation
  const updateProduct = trpc.admin.products.update.useMutation({
    onSuccess: () => {
      toast.success("Price updated successfully");
      setEditingId(null);
      refetch(); // Trigger revalidation
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditPrice(product.price.toString());
  };

  const handleSave = (id: number) => {
    const newPrice = parseInt(editPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      toast.error("Invalid price");
      return;
    }

    updateProduct.mutate({ id, price: newPrice });
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
              <th className="p-4 font-medium text-gray-500">Override</th>
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
                  {product.is_manual_override ? (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Manual
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      IIKO
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === product.id ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(product.id)}
                        className="h-8 bg-green-600 hover:bg-green-700"
                        disabled={updateProduct.isPending}
                      >
                        {updateProduct.isPending ? "Saving..." : "Save"}
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
