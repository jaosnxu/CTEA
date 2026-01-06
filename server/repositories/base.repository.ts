/**
 * BaseRepository - 强制 updated_at 注入 + 原子更新 + 批量更新
 * 
 * 规则：
 * 1. 所有更新操作必须自动注入 updatedAt
 * 2. 支持条件更新（原子更新，防并发）
 * 3. 批量更新使用同一 timestamp
 * 4. 使用 Drizzle 类型安全表达式（eq/and/or）
 */

import { getDb } from '../db';
import { eq, and, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

export class BaseRepository<T extends Record<string, any>> {
  /**
   * 按 ID 更新（自动注入 updated_at）
   * 
   * @param table - Drizzle 表定义
   * @param id - 记录 ID
   * @param data - 更新数据
   * @returns 更新后的记录
   * 
   * @example
   * await repo.updateWithTouchById(member, 123, { name: 'John' });
   */
  async updateWithTouchById(
    table: PgTable,
    id: number,
    data: Partial<T>
  ): Promise<T> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const results = await db.update(table)
      .set({
        ...data,
        updatedAt: new Date()  // 自动注入
      } as any)
      .where(eq((table as any).id, id))  // 细节 2: 必须 eq(table.id, id)
      .returning();
    
    if (results.length === 0) {
      throw new Error(`Record not found: id=${id}`);
    }
    
    return results[0] as T;
  }

  /**
   * 条件更新（自动注入 updated_at）- 核心方法，防并发
   * 
   * @param table - Drizzle 表定义
   * @param where - 条件表达式（使用 and/eq/or 等类型安全表达式，禁止 sql``）
   * @param data - 更新数据
   * @returns 更新后的记录数组（空数组表示条件不满足）
   * 
   * @example
   * // 原子更新：只有状态为 UNUSED 时才更新
   * const result = await repo.updateWithTouchWhere(
   *   couponInstance,
   *   and(eq(couponInstance.id, 123), eq(couponInstance.status, 'UNUSED')),
   *   { status: 'USED', usedAt: new Date() }
   * );
   * if (result.length === 0) {
   *   throw new Error('Coupon already used or not found');
   * }
   */
  async updateWithTouchWhere(
    table: PgTable,
    where: SQL,
    data: Partial<T>
  ): Promise<T[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const results = await db.update(table)
      .set({
        ...data,
        updatedAt: new Date()  // 自动注入
      } as any)
      .where(where)  // 细节 1: 使用 Drizzle 类型安全表达式
      .returning();
    
    return results as T[];
  }

  /**
   * 批量更新（同一 timestamp，支持可选事务）
   * 
   * @param table - Drizzle 表定义
   * @param updates - 更新列表（每项包含 where 条件和 data）
   * @param opts - 可选配置
   *   - maxBatch: 最大批量大小（默认 50）
   *   - tx: 可选事务对象（细节 3）
   * @returns 更新后的记录数组
   * 
   * @example
   * // 批量更新（自动事务）
   * await repo.batchUpdateWithTouch(product, [
   *   { where: eq(product.id, 1), data: { price: 25.00 } },
   *   { where: eq(product.id, 2), data: { price: 30.00 } }
   * ]);
   * 
   * // 批量更新（传入现有事务）
   * await db.transaction(async (tx) => {
   *   await repo.batchUpdateWithTouch(product, updates, { tx });
   * });
   */
  async batchUpdateWithTouch(
    table: PgTable,
    updates: Array<{ where: SQL; data: Partial<T> }>,
    opts?: { maxBatch?: number; tx?: any }  // 细节 3: 支持可选 tx
  ): Promise<T[]> {
    const maxBatch = opts?.maxBatch ?? 50;
    
    if (updates.length > maxBatch) {
      throw new Error(`Batch size too large: ${updates.length} > ${maxBatch}`);
    }
    
    if (updates.length === 0) {
      return [];
    }
    
    // 细节 1.2: 同一批次使用同一 timestamp
    const now = new Date();
    
    // 细节 3: 支持传入事务或自动创建事务
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const executeUpdates = async (txOrDb: any) => {
      const results: T[] = [];
      
      for (const update of updates) {
        const res = await txOrDb.update(table)
          .set({
            ...update.data,
            updatedAt: now  // 同一批次使用同一时间
          } as any)
          .where(update.where)
          .returning();
        
        if (res.length > 0) {
          results.push(res[0] as T);
        }
      }
      
      return results;
    };
    
    // 如果传入了 tx，直接使用；否则创建新事务
    if (opts?.tx) {
      return await executeUpdates(opts.tx);
    } else {
      return await db.transaction(async (tx: any) => {
        return await executeUpdates(tx);
      });
    }
  }

  /**
   * 插入记录（自动注入 created_at 和 updated_at）
   * 
   * @param table - Drizzle 表定义
   * @param data - 插入数据
   * @returns 插入后的记录
   */
  async insert(
    table: PgTable,
    data: Partial<T>
  ): Promise<T> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const now = new Date();
    const results = await db.insert(table)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now
      } as any)
      .returning();
    
    return results[0] as T;
  }

  /**
   * 批量插入（自动注入 created_at 和 updated_at）
   * 
   * @param table - Drizzle 表定义
   * @param dataList - 插入数据列表
   * @returns 插入后的记录数组
   */
  async batchInsert(
    table: PgTable,
    dataList: Partial<T>[]
  ): Promise<T[]> {
    if (dataList.length === 0) {
      return [];
    }
    
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const now = new Date();
    const results = await db.insert(table)
      .values(dataList.map(data => ({
        ...data,
        createdAt: now,
        updatedAt: now
      })) as any)
      .returning();
    
    return results as T[];
  }

  /**
   * 删除记录（按 ID）
   * 
   * @param table - Drizzle 表定义
   * @param id - 记录 ID
   * @returns 删除的记录
   */
  async deleteById(
    table: PgTable,
    id: number
  ): Promise<T> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const results = await db.delete(table)
      .where(eq((table as any).id, id))
      .returning();
    
    if (results.length === 0) {
      throw new Error(`Record not found: id=${id}`);
    }
    
    return results[0] as T;
  }

  /**
   * 条件删除
   * 
   * @param table - Drizzle 表定义
   * @param where - 条件表达式（禁止 sql``）
   * @returns 删除的记录数组
   */
  async deleteWhere(
    table: PgTable,
    where: SQL
  ): Promise<T[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const results = await db.delete(table)
      .where(where)
      .returning();
    
    return results as T[];
  }
}
