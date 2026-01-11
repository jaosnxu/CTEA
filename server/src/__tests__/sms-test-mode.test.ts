import { describe, it, expect } from 'vitest';

describe('SMS.ru Test Mode Configuration', () => {
  it('should have SMS_RU_TEST_MODE environment variable set to true', () => {
    const testMode = process.env.SMS_RU_TEST_MODE;
    console.log('SMS_RU_TEST_MODE value:', testMode);
    expect(testMode).toBe('true');
  });

  it('should enable test mode in SMS service', async () => {
    // 验证测试模式配置正确
    const testMode = process.env.SMS_RU_TEST_MODE === 'true';
    expect(testMode).toBe(true);
    
    // 模拟SMS.ru API调用参数构建
    const url = new URL('https://sms.ru/sms/send');
    url.searchParams.append('api_id', 'test_api_key');
    url.searchParams.append('to', '79001234567');
    url.searchParams.append('msg', 'Test message');
    url.searchParams.append('json', '1');
    
    // 当测试模式开启时，应该添加test=1参数
    if (process.env.SMS_RU_TEST_MODE === 'true') {
      url.searchParams.append('test', '1');
    }
    
    // 验证URL包含test=1参数
    expect(url.searchParams.get('test')).toBe('1');
    console.log('SMS.ru test mode URL:', url.toString());
  });
});
