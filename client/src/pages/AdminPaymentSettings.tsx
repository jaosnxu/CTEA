import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function AdminPaymentSettings() {
  const { data: settings, isLoading, refetch } = trpc.admin.payment.getSettings.useQuery();
  const updateMutation = trpc.admin.payment.updateSettings.useMutation();
  const testConnectionMutation = trpc.admin.payment.testConnection.useMutation();

  const [formData, setFormData] = useState({
    provider: 'mock' as 'tinkoff' | 'yookassa' | 'mock',
    enabled: true,
    testMode: true,
    tinkoffTerminalKey: '',
    tinkoffSecretKey: '',
    yookassaShopId: '',
    yookassaSecretKey: '',
    enablePreAuth: true,
    autoVoidOnFailure: true,
  });

  // Update form when settings load
  useState(() => {
    if (settings) {
      setFormData({
        provider: settings.provider,
        enabled: settings.enabled,
        testMode: settings.testMode,
        tinkoffTerminalKey: settings.tinkoffTerminalKey,
        tinkoffSecretKey: settings.tinkoffSecretKey,
        yookassaShopId: settings.yookassaShopId,
        yookassaSecretKey: settings.yookassaSecretKey,
        enablePreAuth: settings.enablePreAuth,
        autoVoidOnFailure: settings.autoVoidOnFailure,
      });
    }
  });

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(formData);
      toast.success('Настройки оплаты сохранены');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка сохранения');
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnectionMutation.mutateAsync({
        provider: formData.provider,
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка подключения');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Настройки оплаты</h1>
        <p className="text-muted-foreground mt-2">
          Управление платежными шлюзами и настройками безопасности
        </p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Основные настройки</CardTitle>
            <CardDescription>
              Выберите платежный шлюз и режим работы
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Платежный шлюз</Label>
              <Select
                value={formData.provider}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, provider: value })
                }
              >
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock (Тестовый)</SelectItem>
                  <SelectItem value="tinkoff">Tinkoff Acquiring</SelectItem>
                  <SelectItem value="yookassa">YooKassa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Включить оплату</Label>
                <p className="text-sm text-muted-foreground">
                  Разрешить пользователям оплачивать заказы
                </p>
              </div>
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="testMode">Тестовый режим</Label>
                <p className="text-sm text-muted-foreground">
                  Использовать тестовую среду (без реальных платежей)
                </p>
              </div>
              <Switch
                id="testMode"
                checked={formData.testMode}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, testMode: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Tinkoff Settings */}
        {formData.provider === 'tinkoff' && (
          <Card>
            <CardHeader>
              <CardTitle>Tinkoff Acquiring</CardTitle>
              <CardDescription>
                Настройки интеграции с Tinkoff
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tinkoffTerminalKey">Terminal Key</Label>
                <Input
                  id="tinkoffTerminalKey"
                  type="text"
                  placeholder="Введите Terminal Key"
                  value={formData.tinkoffTerminalKey}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tinkoffTerminalKey: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tinkoffSecretKey">Secret Key</Label>
                <Input
                  id="tinkoffSecretKey"
                  type="password"
                  placeholder="Введите Secret Key"
                  value={formData.tinkoffSecretKey}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tinkoffSecretKey: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Получите ключи в личном кабинете{' '}
                  <a
                    href="https://business.tinkoff.ru"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    Tinkoff Business
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* YooKassa Settings */}
        {formData.provider === 'yookassa' && (
          <Card>
            <CardHeader>
              <CardTitle>YooKassa</CardTitle>
              <CardDescription>
                Настройки интеграции с YooKassa (Яндекс.Касса)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="yookassaShopId">Shop ID</Label>
                <Input
                  id="yookassaShopId"
                  type="text"
                  placeholder="Введите Shop ID"
                  value={formData.yookassaShopId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      yookassaShopId: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="yookassaSecretKey">Secret Key</Label>
                <Input
                  id="yookassaSecretKey"
                  type="password"
                  placeholder="Введите Secret Key"
                  value={formData.yookassaSecretKey}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      yookassaSecretKey: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Получите ключи в личном кабинете{' '}
                  <a
                    href="https://yookassa.ru"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    YooKassa
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Настройки безопасности</CardTitle>
            <CardDescription>
              Управление логикой предавторизации и отмены платежей
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enablePreAuth">Предавторизация (Hold-Capture)</Label>
                <p className="text-sm text-muted-foreground">
                  Сначала холдировать средства, затем списывать после подтверждения
                </p>
              </div>
              <Switch
                id="enablePreAuth"
                checked={formData.enablePreAuth}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enablePreAuth: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoVoidOnFailure">Автоотмена при сбое</Label>
                <p className="text-sm text-muted-foreground">
                  Автоматически отменять платеж, если IIKO не подтвердил заказ
                </p>
              </div>
              <Switch
                id="autoVoidOnFailure"
                checked={formData.autoVoidOnFailure}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autoVoidOnFailure: checked })
                }
              />
            </div>

            <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-900 dark:text-green-100">
                Рекомендуется включить обе опции для максимальной безопасности
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1"
          >
            {updateMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Сохранить настройки
          </Button>

          {formData.provider !== 'mock' && (
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending}
              className="flex-1"
            >
              {testConnectionMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Проверить подключение
            </Button>
          )}
        </div>

        {/* Status Indicator */}
        {settings && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Статус платежного шлюза</p>
                  <p className="text-sm text-muted-foreground">
                    Последнее обновление: {new Date(settings.updatedAt).toLocaleString('ru-RU')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {settings.enabled ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Активен</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Отключен</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
