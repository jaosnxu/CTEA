import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Shield, RefreshCw } from "lucide-react";

export default function IIKOSyncDemo() {
  const [syncResult, setSyncResult] = useState<any>(null);

  const { data: products = [], refetch: refetchProducts } = trpc.products.list.useQuery();
  const syncMutation = trpc.iiko.sync.useMutation();
  const resetMutation = trpc.iiko.resetOverrides.useMutation();

  const handleSync = async (forceOverride: boolean = false) => {
    try {
      const result = await syncMutation.mutateAsync({ forceOverride });
      setSyncResult(result);
      refetchProducts();
      
      if (result.skipped > 0) {
        toast.success(`Sync complete: ${result.updated} updated, ${result.skipped} protected`);
      } else {
        toast.success(`Sync complete: ${result.updated} products updated`);
      }
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
    }
  };

  const handleReset = async () => {
    try {
      await resetMutation.mutateAsync();
      setSyncResult(null);
      refetchProducts();
      toast.success("All override flags cleared");
    } catch (error: any) {
      toast.error(`Reset failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">🔄 IIKO Sync Simulator</h1>
          <p className="text-gray-600">
            Demonstrate Shadow DB manual override protection mechanism
          </p>
        </div>

        {/* Control Panel */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Control Panel</h2>
          <div className="flex gap-4">
            <Button
              onClick={() => handleSync(false)}
              disabled={syncMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {syncMutation.isPending ? "Syncing..." : "Run IIKO Sync (Safe)"}
            </Button>
            <Button
              onClick={() => handleSync(true)}
              disabled={syncMutation.isPending}
              variant="destructive"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Force Sync (Override All)
            </Button>
            <Button
              onClick={handleReset}
              disabled={resetMutation.isPending}
              variant="outline"
            >
              Reset All Flags
            </Button>
          </div>
        </Card>

        {/* Sync Result */}
        {syncResult && (
          <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
            <h2 className="text-xl font-bold mb-4">📊 Sync Result</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{syncResult.updated}</div>
                <div className="text-sm text-gray-600">Updated</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{syncResult.skipped}</div>
                <div className="text-sm text-gray-600">Protected</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{syncResult.conflicts.length}</div>
                <div className="text-sm text-gray-600">Conflicts</div>
              </div>
            </div>

            {syncResult.conflicts.length > 0 && (
              <div className="mt-4">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-600" />
                  Protected Products (Manual Override Active)
                </h3>
                <div className="space-y-2">
                  {syncResult.conflicts.map((conflict: any) => (
                    <div key={conflict.id} className="bg-white p-3 rounded-lg border border-orange-200">
                      <div className="font-medium">#{conflict.id} {conflict.name}</div>
                      <div className="text-sm text-gray-600">{conflict.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Product List */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Current Products</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Name (RU)</th>
                  <th className="p-3">Price (₽)</th>
                  <th className="p-3">Override Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.slice(0, 3).map((product: any) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-500">#{product.id}</td>
                    <td className="p-3 font-medium">{product.name_ru}</td>
                    <td className="p-3 font-bold">₽{product.price}</td>
                    <td className="p-3">
                      {product.is_manual_override ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          <Shield className="w-3 h-3" />
                          Manual Override
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          <CheckCircle className="w-3 h-3" />
                          IIKO Managed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6 mt-6 bg-yellow-50 border-yellow-200">
          <h2 className="text-xl font-bold mb-4">📝 Demo Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Go to <a href="/admin/products" className="text-blue-600 underline">/admin/products</a> and manually change Product #1 price to ₽500</li>
            <li>Return here and click "Run IIKO Sync (Safe)"</li>
            <li>Observe that Product #1 keeps ₽500 (protected), while others update to IIKO prices</li>
            <li>Check the "Protected Products" section to see conflict details</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
