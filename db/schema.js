import {sqliteTable,text,integer,uniqueIndex,index} from 'drizzle-orm/sqlite-core';
export const pools=sqliteTable('practice_pools',{
 id:text('id').primaryKey(),owner:text('owner_hash').notNull(),topic:text('topic').notNull(),difficulty:text('difficulty').notNull(),
 generated:integer('generated').notNull().default(0),completed:integer('completed').notNull().default(0),checkpoint:integer('refill_checkpoint').notNull().default(0),
 lease:text('lease_id').notNull().default(''),leaseUntil:integer('lease_until').notNull().default(0),error:text('last_error').notNull().default(''),created:integer('created_at').notNull()
},t=>[uniqueIndex('pool_owner_settings').on(t.owner,t.topic,t.difficulty)]);
export const items=sqliteTable('practice_items',{
 id:text('id').primaryKey(),pool:text('pool_id').notNull().references(()=>pools.id),position:integer('position').notNull(),fingerprint:text('fingerprint').notNull(),payload:text('payload').notNull(),
 selected:integer('selected'),correct:integer('correct'),answeredAt:integer('answered_at')
},t=>[uniqueIndex('item_pool_position').on(t.pool,t.position),uniqueIndex('item_pool_fingerprint').on(t.pool,t.fingerprint),index('item_answers').on(t.pool,t.answeredAt)]);
