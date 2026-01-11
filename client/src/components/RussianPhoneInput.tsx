/**
 * RussianPhoneInput - 俄罗斯手机号输入组件
 * 
 * 俄罗斯手机号格式规则：
 * - 国际格式：+7 XXX XXX XX XX (11位数字，含国家码)
 * - 本地格式：8 XXX XXX XX XX (11位数字，8为长途前缀)
 * - 运营商号段：9XX (移动), 495/499 (莫斯科固话), 812 (圣彼得堡固话)
 * 
 * 功能特性：
 * - 自动添加 +7 前缀
 * - 自动格式化显示：+7 (XXX) XXX-XX-XX
 * - 实时校验11位数字
 * - 支持粘贴自动清理非数字字符
 * - 支持 8 开头自动转换为 +7
 */

import { useState, useEffect, useRef, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface RussianPhoneInputProps {
  value?: string;
  onChange?: (value: string, isValid: boolean) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  autoFocus?: boolean;
}

/**
 * 校验俄罗斯手机号格式
 * @param phone - 纯数字手机号（不含+7前缀）
 * @returns 是否有效
 */
export function validateRussianPhone(phone: string): boolean {
  // 移除所有非数字字符
  const digits = phone.replace(/\D/g, '');
  
  // 如果以7或8开头，移除第一位
  let normalizedDigits = digits;
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    normalizedDigits = digits.slice(1);
  }
  
  // 必须是10位数字
  if (normalizedDigits.length !== 10) {
    return false;
  }
  
  // 俄罗斯移动运营商号段：9XX
  // 莫斯科固话：495, 499
  // 圣彼得堡固话：812
  // 其他地区：3XX, 4XX, 8XX 等
  const validPrefixes = /^(9\d{2}|[34]\d{2}|8\d{2}|495|499|812)/;
  
  return validPrefixes.test(normalizedDigits);
}

/**
 * 格式化俄罗斯手机号为标准显示格式
 * @param phone - 纯数字手机号
 * @returns 格式化后的字符串 +7 (XXX) XXX-XX-XX
 */
export function formatRussianPhone(phone: string): string {
  // 移除所有非数字字符
  let digits = phone.replace(/\D/g, '');
  
  // 如果以7或8开头，移除第一位
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    digits = digits.slice(1);
  }
  
  // 限制最多10位
  digits = digits.slice(0, 10);
  
  // 根据长度逐步格式化
  if (digits.length === 0) {
    return '';
  } else if (digits.length <= 3) {
    return `(${digits}`;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else if (digits.length <= 8) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
  }
}

/**
 * 从格式化字符串中提取纯数字
 * @param formatted - 格式化后的字符串
 * @returns 纯数字字符串（10位）
 */
export function extractPhoneDigits(formatted: string): string {
  return formatted.replace(/\D/g, '').slice(0, 10);
}

/**
 * 获取完整的国际格式手机号
 * @param phone - 10位纯数字
 * @returns +7XXXXXXXXXX 格式
 */
export function getInternationalFormat(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(0, 10);
  return digits.length === 10 ? `+7${digits}` : '';
}

const RussianPhoneInput = forwardRef<HTMLInputElement, RussianPhoneInputProps>(
  (
    {
      value = '',
      onChange,
      onBlur,
      placeholder = "(XXX) XXX-XX-XX",
      className,
      disabled = false,
      error,
      label,
      required = false,
      autoFocus = false,
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // 同步外部value到内部状态
    useEffect(() => {
      if (value) {
        const formatted = formatRussianPhone(value);
        setDisplayValue(formatted);
        setIsValid(validateRussianPhone(value));
      } else {
        setDisplayValue('');
        setIsValid(false);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // 提取纯数字
      let digits = input.replace(/\D/g, '');
      
      // 如果用户输入了 8 开头（俄罗斯本地长途前缀），转换为标准格式
      if (digits.startsWith('8') && digits.length > 1) {
        digits = digits.slice(1);
      }
      // 如果用户输入了 7 开头（国家码），移除
      if (digits.startsWith('7') && digits.length > 1) {
        digits = digits.slice(1);
      }
      
      // 限制10位
      digits = digits.slice(0, 10);
      
      // 格式化显示
      const formatted = formatRussianPhone(digits);
      setDisplayValue(formatted);
      
      // 校验
      const valid = digits.length === 10 && validateRussianPhone(digits);
      setIsValid(valid);
      
      // 回调
      onChange?.(digits, valid);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      
      // 清理粘贴的文本，提取数字
      let digits = pastedText.replace(/\D/g, '');
      
      // 处理各种格式：+7XXX, 8XXX, 7XXX
      if (digits.startsWith('7') && digits.length === 11) {
        digits = digits.slice(1);
      } else if (digits.startsWith('8') && digits.length === 11) {
        digits = digits.slice(1);
      }
      
      digits = digits.slice(0, 10);
      
      const formatted = formatRussianPhone(digits);
      setDisplayValue(formatted);
      
      const valid = digits.length === 10 && validateRussianPhone(digits);
      setIsValid(valid);
      
      onChange?.(digits, valid);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
      onBlur?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // 允许：退格、删除、Tab、Escape、Enter、方向键
      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      
      // 允许 Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
        return;
      }
      
      // 允许数字键
      if (/^\d$/.test(e.key)) {
        return;
      }
      
      // 允许特殊键
      if (allowedKeys.includes(e.key)) {
        return;
      }
      
      // 阻止其他按键
      e.preventDefault();
    };

    const showError = error || (displayValue && !isValid && !isFocused);
    const errorMessage = error || (displayValue && !isValid ? 'Неверный формат номера' : '');

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {/* +7 前缀 */}
          <div className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium select-none pointer-events-none",
            disabled && "text-gray-400"
          )}>
            +7
          </div>
          
          <input
            ref={ref || inputRef}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={displayValue}
            onChange={handleChange}
            onPaste={handlePaste}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            className={cn(
              "w-full pl-10 pr-10 py-2.5 border rounded-lg text-base transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
              showError && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
              !showError && isValid && displayValue && "border-green-500 focus:ring-green-500/20 focus:border-green-500",
              disabled && "bg-gray-100 cursor-not-allowed text-gray-500",
              className
            )}
          />
          
          {/* 状态图标 */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {displayValue && isValid && (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {displayValue && !isValid && !isFocused && (
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        </div>
        
        {/* 错误提示 */}
        {errorMessage && (
          <p className="mt-1 text-xs text-red-500">{errorMessage}</p>
        )}
        
        {/* 格式提示 */}
        {!errorMessage && isFocused && !displayValue && (
          <p className="mt-1 text-xs text-gray-400">
            Формат: +7 (XXX) XXX-XX-XX
          </p>
        )}
      </div>
    );
  }
);

RussianPhoneInput.displayName = 'RussianPhoneInput';

export default RussianPhoneInput;
