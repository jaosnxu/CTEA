/**
 * DeepSeek AI 翻译服务
 *
 * 集成 DeepSeek API 实现中文到俄语/英语的自动翻译
 * 用于翻译管理系统的自动翻译功能
 */

import { ENV } from "../../_core/env";

// DeepSeek API 配置
const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL ||
  "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

// 翻译结果接口
export interface TranslationResult {
  success: boolean;
  textRu?: string;
  textEn?: string;
  confidence?: number;
  error?: string;
}

// 批量翻译结果接口
export interface BatchTranslationResult {
  success: boolean;
  results: Array<{
    key: string;
    textZh: string;
    textRu?: string;
    textEn?: string;
    confidence?: number;
    error?: string;
  }>;
  totalSuccess: number;
  totalFailed: number;
}

/**
 * 构建翻译提示词
 */
function buildTranslationPrompt(
  text: string,
  targetLang: "ru" | "en",
  context?: string
): string {
  const langName = targetLang === "ru" ? "俄语" : "英语";
  const langCode = targetLang === "ru" ? "Russian" : "English";

  let prompt = `你是一个专业的翻译助手，专门为奶茶店/茶饮品牌进行本地化翻译。

请将以下中文文本翻译成${langName}（${langCode}）：

原文：${text}
`;

  if (context) {
    prompt += `
上下文说明：${context}
`;
  }

  prompt += `
翻译要求：
1. 保持品牌调性，翻译要自然流畅，符合目标语言的表达习惯
2. 对于专业术语（如珍珠、波霸、奶盖等），使用目标市场常用的翻译
3. 如果是产品名称，可以保留品牌特色，但要确保目标用户能理解
4. 如果是UI文本，要简洁明了
5. 只返回翻译结果，不要添加任何解释或注释

翻译结果：`;

  return prompt;
}

/**
 * 调用 DeepSeek API 进行翻译
 */
async function callDeepSeekAPI(prompt: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "你是一个专业的多语言翻译助手，专注于茶饮品牌的本地化翻译。你的翻译准确、自然、符合目标语言的表达习惯。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // 低温度以获得更稳定的翻译
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from DeepSeek API");
  }

  return content.trim();
}

/**
 * 翻译单条文本
 *
 * @param textZh - 中文原文
 * @param context - 上下文说明（可选）
 * @returns 翻译结果（包含俄语和英语）
 */
export async function translateText(
  textZh: string,
  context?: string
): Promise<TranslationResult> {
  try {
    // 并行翻译俄语和英语
    const [textRu, textEn] = await Promise.all([
      callDeepSeekAPI(buildTranslationPrompt(textZh, "ru", context)),
      callDeepSeekAPI(buildTranslationPrompt(textZh, "en", context)),
    ]);

    // 计算置信度（基于翻译长度比例的简单估算）
    const ruRatio = textRu.length / textZh.length;
    const enRatio = textEn.length / textZh.length;

    // 俄语通常比中文长1.5-3倍，英语通常比中文长2-4倍
    const ruConfidence = Math.min(
      100,
      Math.max(60, 100 - Math.abs(ruRatio - 2) * 20)
    );
    const enConfidence = Math.min(
      100,
      Math.max(60, 100 - Math.abs(enRatio - 3) * 15)
    );
    const confidence = Math.round((ruConfidence + enConfidence) / 2);

    return {
      success: true,
      textRu,
      textEn,
      confidence,
    };
  } catch (error) {
    console.error("[DeepSeek Translation] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown translation error",
    };
  }
}

/**
 * 仅翻译到俄语
 */
export async function translateToRussian(
  textZh: string,
  context?: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const text = await callDeepSeekAPI(
      buildTranslationPrompt(textZh, "ru", context)
    );
    return { success: true, text };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown translation error",
    };
  }
}

/**
 * 仅翻译到英语
 */
export async function translateToEnglish(
  textZh: string,
  context?: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const text = await callDeepSeekAPI(
      buildTranslationPrompt(textZh, "en", context)
    );
    return { success: true, text };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown translation error",
    };
  }
}

/**
 * 批量翻译
 *
 * @param items - 待翻译的条目数组
 * @returns 批量翻译结果
 */
export async function translateBatch(
  items: Array<{ key: string; textZh: string; context?: string }>
): Promise<BatchTranslationResult> {
  const results: BatchTranslationResult["results"] = [];
  let totalSuccess = 0;
  let totalFailed = 0;

  // 使用 Promise.allSettled 并行处理，但限制并发数
  const BATCH_SIZE = 5; // 每批5个，避免 API 限流

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async item => {
        const result = await translateText(item.textZh, item.context);
        return {
          key: item.key,
          textZh: item.textZh,
          ...result,
        };
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
        if (result.value.success) {
          totalSuccess++;
        } else {
          totalFailed++;
        }
      } else {
        totalFailed++;
        results.push({
          key: batch[batchResults.indexOf(result)]?.key || "unknown",
          textZh: batch[batchResults.indexOf(result)]?.textZh || "",
          error: result.reason?.message || "Unknown error",
        });
      }
    }

    // 批次间延迟，避免 API 限流
    if (i + BATCH_SIZE < items.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return {
    success: totalFailed === 0,
    results,
    totalSuccess,
    totalFailed,
  };
}

/**
 * 检查 DeepSeek API 是否可用
 */
export async function checkDeepSeekAvailability(): Promise<{
  available: boolean;
  error?: string;
}> {
  if (!DEEPSEEK_API_KEY) {
    return { available: false, error: "DEEPSEEK_API_KEY is not configured" };
  }

  try {
    // 发送一个简单的测试请求
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10,
      }),
    });

    if (response.ok) {
      return { available: true };
    } else {
      const errorText = await response.text();
      return {
        available: false,
        error: `API returned ${response.status}: ${errorText}`,
      };
    }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

/**
 * 翻译茶饮专业术语映射
 * 用于提高翻译一致性
 */
export const TEA_TERMINOLOGY: Record<string, { ru: string; en: string }> = {
  珍珠: { ru: "Тапиока", en: "Tapioca Pearls" },
  波霸: { ru: "Боба", en: "Boba" },
  奶盖: { ru: "Сырная пенка", en: "Cheese Foam" },
  芋圆: { ru: "Таро шарики", en: "Taro Balls" },
  椰果: { ru: "Кокосовое желе", en: "Coconut Jelly" },
  仙草: { ru: "Травяное желе", en: "Grass Jelly" },
  布丁: { ru: "Пудинг", en: "Pudding" },
  红豆: { ru: "Красная фасоль", en: "Red Bean" },
  绿豆: { ru: "Зелёная фасоль", en: "Mung Bean" },
  芋泥: { ru: "Пюре из таро", en: "Taro Paste" },
  黑糖: { ru: "Тростниковый сахар", en: "Brown Sugar" },
  蜂蜜: { ru: "Мёд", en: "Honey" },
  抹茶: { ru: "Матча", en: "Matcha" },
  乌龙: { ru: "Улун", en: "Oolong" },
  茉莉: { ru: "Жасмин", en: "Jasmine" },
  铁观音: { ru: "Тегуаньинь", en: "Tieguanyin" },
  大红袍: { ru: "Да Хун Пао", en: "Da Hong Pao" },
  冰沙: { ru: "Смузи", en: "Smoothie" },
  奶茶: { ru: "Молочный чай", en: "Milk Tea" },
  果茶: { ru: "Фруктовый чай", en: "Fruit Tea" },
  鲜奶: { ru: "Свежее молоко", en: "Fresh Milk" },
  燕麦奶: { ru: "Овсяное молоко", en: "Oat Milk" },
  椰奶: { ru: "Кокосовое молоко", en: "Coconut Milk" },
  少糖: { ru: "Меньше сахара", en: "Less Sugar" },
  半糖: { ru: "Половина сахара", en: "Half Sugar" },
  无糖: { ru: "Без сахара", en: "No Sugar" },
  正常糖: { ru: "Стандарт", en: "Normal Sugar" },
  多糖: { ru: "Больше сахара", en: "Extra Sugar" },
  少冰: { ru: "Мало льда", en: "Less Ice" },
  去冰: { ru: "Без льда", en: "No Ice" },
  常温: { ru: "Комнатная температура", en: "Room Temperature" },
  热饮: { ru: "Горячий", en: "Hot" },
  冰饮: { ru: "Холодный", en: "Iced" },
  中杯: { ru: "Средний", en: "Medium" },
  大杯: { ru: "Большой", en: "Large" },
  超大杯: { ru: "Очень большой", en: "Extra Large" },
};

/**
 * 使用术语表预处理文本
 * 在调用 AI 翻译前，先替换已知术语
 */
export function preprocessWithTerminology(
  textZh: string,
  targetLang: "ru" | "en"
): {
  processed: string;
  replacements: Array<{ original: string; replacement: string }>;
} {
  let processed = textZh;
  const replacements: Array<{ original: string; replacement: string }> = [];

  for (const [zh, translations] of Object.entries(TEA_TERMINOLOGY)) {
    if (processed.includes(zh)) {
      const replacement = translations[targetLang];
      processed = processed.replace(new RegExp(zh, "g"), `【${replacement}】`);
      replacements.push({ original: zh, replacement });
    }
  }

  return { processed, replacements };
}
