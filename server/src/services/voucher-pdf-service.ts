/**
 * CHUTEA 财务凭证 PDF 生成服务
 *
 * 功能：
 * 1. 生成俄语财务凭证 HTML
 * 2. 上传到 S3 存储
 * 3. 返回可访问的 URL
 */

import { storagePut } from "../../storage";

interface VoucherData {
  voucherNo: string;
  type: "WITHDRAWAL" | "REFUND" | "SETTLEMENT";
  amount: number;
  currency: string;
  recipientName: string;
  transactionId: string;
  status: string;
  operatorName: string;
  description: {
    ru: string;
    zh: string;
    en?: string;
  };
  createdAt: Date;
}

/**
 * 生成财务凭证 HTML 内容
 */
function generateVoucherHtml(data: VoucherData): string {
  const statusMap: Record<string, { ru: string; color: string }> = {
    PENDING: { ru: "ОЖИДАНИЕ", color: "#f59e0b" },
    PROCESSING: { ru: "В ОБРАБОТКЕ", color: "#3b82f6" },
    COMPLETED: { ru: "ЗАВЕРШЕНО", color: "#22c55e" },
    REJECTED: { ru: "ОТКЛОНЕНО", color: "#ef4444" },
  };

  const typeMap: Record<string, string> = {
    WITHDRAWAL: "Вывод средств (Withdrawal)",
    REFUND: "Возврат (Refund)",
    SETTLEMENT: "Расчет (Settlement)",
  };

  const statusInfo = statusMap[data.status] || statusMap["PROCESSING"];
  const formattedDate = data.createdAt.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const statusIcon =
    data.status === "COMPLETED"
      ? "✅"
      : data.status === "REJECTED"
        ? "❌"
        : "⏳";
  const amountFormatted = data.amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
  });
  const generatedAt = new Date().toLocaleString("ru-RU");
  const descriptionEn = data.description.en || "Withdrawal transaction";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Финансовый ваучер ${data.voucherNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .voucher {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #f97316, #fb923c);
      color: white;
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 48px;
      height: 48px;
      background: white;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }
    .logo-text h1 {
      font-size: 24px;
      font-weight: bold;
    }
    .logo-text p {
      font-size: 12px;
      opacity: 0.9;
    }
    .voucher-no {
      text-align: right;
    }
    .voucher-no small {
      display: block;
      font-size: 11px;
      opacity: 0.8;
    }
    .voucher-no strong {
      font-size: 14px;
    }
    .content {
      padding: 32px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6b7280;
      font-size: 14px;
    }
    .info-value {
      color: #111827;
      font-weight: 500;
      font-size: 14px;
    }
    .amount {
      color: #f97316;
      font-size: 28px;
      font-weight: bold;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background: ${statusInfo.color}20;
      color: ${statusInfo.color};
    }
    .description-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 16px;
      margin-top: 24px;
    }
    .description-box h4 {
      font-size: 14px;
      color: #92400e;
      margin-bottom: 12px;
    }
    .description-box p {
      font-size: 13px;
      color: #78350f;
      margin: 4px 0;
    }
    .footer {
      background: #f9fafb;
      padding: 16px 32px;
      font-size: 11px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="voucher">
    <div class="header">
      <div class="logo">
        <div class="logo-icon">🧋</div>
        <div class="logo-text">
          <h1>CHUTEA</h1>
          <p>Финансовый ваучер / Financial Voucher</p>
        </div>
      </div>
      <div class="voucher-no">
        <small>Номер ваучера</small>
        <strong>№ ${data.voucherNo}</strong>
      </div>
    </div>
    
    <div class="content">
      <div class="section-title">
        📄 ИНФОРМАЦИЯ О ТРАНЗАКЦИИ
      </div>
      
      <div class="info-row">
        <span class="info-label">Тип операции:</span>
        <span class="info-value">${typeMap[data.type]}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Сумма:</span>
        <span class="info-value amount">₽ ${amountFormatted}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Валюта:</span>
        <span class="info-value">${data.currency} (Российский рубль)</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Получатель:</span>
        <span class="info-value">${data.recipientName}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">ID транзакции:</span>
        <span class="info-value">${data.transactionId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Статус:</span>
        <span class="info-value">
          <span class="status-badge">
            ${statusIcon}
            ${statusInfo.ru}
          </span>
        </span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Дата создания:</span>
        <span class="info-value">${formattedDate}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Одобрено:</span>
        <span class="info-value">${data.operatorName} (Администратор)</span>
      </div>
      
      <div class="description-box">
        <h4>📝 ОПИСАНИЕ / DESCRIPTION</h4>
        <p><strong>RU:</strong> ${data.description.ru}</p>
        <p><strong>ZH:</strong> ${data.description.zh}</p>
        <p><strong>EN:</strong> ${descriptionEn}</p>
      </div>
    </div>
    
    <div class="footer">
      <p>📄 Данный документ является официальным финансовым ваучером системы CHUTEA.</p>
      <p>📄 This document is an official financial voucher of the CHUTEA system.</p>
      <p>⏰ Сгенерировано: ${generatedAt} | CHUTEA Financial System v1.0</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 生成财务凭证并上传到 S3
 */
export async function generateAndUploadVoucherPdf(
  data: VoucherData
): Promise<{ url: string; key: string }> {
  try {
    // 生成 HTML 内容
    const htmlContent = generateVoucherHtml(data);

    // 生成文件名
    const fileName = `vouchers/${data.voucherNo}.html`;

    // 上传到 S3
    const result = await storagePut(
      fileName,
      Buffer.from(htmlContent, "utf-8"),
      "text/html"
    );

    console.log(`[VoucherService] Voucher uploaded: ${result.url}`);

    return result;
  } catch (error) {
    console.error("[VoucherService] Failed to generate voucher:", error);
    throw error;
  }
}

/**
 * 获取凭证状态文本
 */
export function getStatusText(
  status: string,
  lang: "ru" | "zh" | "en" = "ru"
): string {
  const statusTexts: Record<string, Record<string, string>> = {
    PENDING: { ru: "Ожидание", zh: "待处理", en: "Pending" },
    PROCESSING: { ru: "В обработке", zh: "处理中", en: "Processing" },
    COMPLETED: { ru: "Завершено", zh: "已完成", en: "Completed" },
    REJECTED: { ru: "Отклонено", zh: "已拒绝", en: "Rejected" },
  };

  return statusTexts[status]?.[lang] || status;
}
