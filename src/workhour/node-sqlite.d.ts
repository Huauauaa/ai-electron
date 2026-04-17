/** Minimal typings for Node.js built-in `node:sqlite` (Node 22+). */
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }

  export class StatementSync {
    run(...params: unknown[]): { changes?: number; lastInsertRowid?: number };
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
  }
}
