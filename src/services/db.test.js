import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';
import { dbService } from './db';

describe('Database Service (IndexedDB)', () => {
  it('should save and retrieve an item', async () => {
    const mockItem = {
      id: '123',
      raw_text: 'test save',
      category: 'STATIC_INTEL',
      priority: 'LOW',
      event_timestamp: null,
      metadata_json: '{}',
      created_at: Date.now()
    };
    
    await dbService.saveItem(mockItem);
    const items = await dbService.queryItems();
    
    expect(items.length).toBeGreaterThan(0);
    expect(items.find(i => i.id === '123')).toBeDefined();
    expect(items.find(i => i.id === '123').raw_text).toBe('test save');
  });

  it('should delete an item', async () => {
    const mockItem = {
      id: '456',
      raw_text: 'test delete',
      category: 'STATIC_INTEL',
      priority: 'LOW',
      event_timestamp: null,
      metadata_json: '{}',
      created_at: Date.now()
    };
    
    await dbService.saveItem(mockItem);
    await dbService.deleteItem('456');
    const items = await dbService.queryItems();
    
    expect(items.find(i => i.id === '456')).toBeUndefined();
  });
});
