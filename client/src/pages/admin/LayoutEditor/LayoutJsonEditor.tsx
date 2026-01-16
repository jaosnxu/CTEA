/**
 * JSON 编辑器组件
 * 允许直接编辑布局配置的 JSON
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { PageLayoutConfig } from "@shared/types/layout";

interface LayoutJsonEditorProps {
  config: PageLayoutConfig;
  onChange: (config: PageLayoutConfig) => void;
  language: "zh" | "ru" | "en";
}

export function LayoutJsonEditor({
  config,
  onChange,
  language,
}: LayoutJsonEditorProps) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setJsonText(JSON.stringify(config, null, 2));
    setError(null);
  }, [config]);

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onChange(parsed);
      setError(null);
    } catch (err) {
      setError(
        language === "zh"
          ? "JSON 格式错误，请检查语法"
          : language === "ru"
          ? "Неверный формат JSON, проверьте синтаксис"
          : "Invalid JSON format, please check syntax"
      );
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <textarea
          className="w-full h-[600px] p-4 font-mono text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          value={jsonText}
          onChange={e => {
            setJsonText(e.target.value);
            setError(null);
          }}
          spellCheck={false}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleApply}>
          {language === "zh" && "应用更改"}
          {language === "ru" && "Применить изменения"}
          {language === "en" && "Apply Changes"}
        </Button>
      </div>
    </div>
  );
}
