import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
mkdirSync('.local',{recursive:true});
export function openLocalDatabase(filename='.local/practice.sqlite'){
 const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY NOT NULL)');
 for(const filename of readdirSync(new URL('./drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort()){
  if(sqlite.prepare('SELECT name FROM _local_migrations WHERE name=?').get(filename))continue;
  sqlite.exec('BEGIN');try{sqlite.exec(readFileSync(new URL('./drizzle/'+filename,import.meta.url),'utf8'));sqlite.prepare('INSERT INTO _local_migrations (name) VALUES (?)').run(filename);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}
 }
 return{prepare(sql){const statement=sqlite.prepare(sql);const bind=(...args)=>({first:async()=>statement.get(...args)||null,all:async()=>({results:statement.all(...args)}),run:async()=>({meta:statement.run(...args)})});return{...bind(),bind};},async batch(statements){sqlite.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.run());sqlite.exec('COMMIT');return rows;}catch(e){sqlite.exec('ROLLBACK');throw e;}},close:()=>sqlite.close()};
}
