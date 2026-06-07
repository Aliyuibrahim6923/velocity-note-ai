import { describe, it, expect } from 'vitest';
import { triageInput } from './ai';

describe('Deterministic AI Parser', () => {
  it('should categorize a financial log with amount', async () => {
    // window.ai won't be defined in the test environment, so it will fall back to deterministic
    const result = await triageInput('I just paid aliyu 500k for rent');
    expect(result.category).toBe('FINANCIAL_LOG');
    expect(result.priority).toBe('NORMAL');
    const meta = JSON.parse(result.metadata_json);
    expect(meta.amount).toBe(500000); // 500k -> 500000
  });

  it('should categorize a critical action item', async () => {
    const result = await triageInput('URGENT need to email Sarah the pitch deck');
    expect(result.category).toBe('ACTION_ITEM');
    expect(result.priority).toBe('HIGH');
  });

  it('should categorize a calendar event', async () => {
    const result = await triageInput('Dinner with John tomorrow at 7 PM');
    expect(result.category).toBe('CALENDAR_EVENT');
    expect(result.priority).toBe('NORMAL');
    const meta = JSON.parse(result.metadata_json);
    expect(meta.time).toBe('7 pm');
  });

  it('should default to static intel', async () => {
    const result = await triageInput('The hotel room number is 1402');
    expect(result.category).toBe('STATIC_INTEL');
    expect(result.priority).toBe('LOW');
  });
});
