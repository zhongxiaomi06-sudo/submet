declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  interface Database {
    run(sql: string, params?: any[] | Record<string, any>): Database;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  interface Statement {
    bind(params?: any[] | Record<string, any>): boolean;
    step(): boolean;
    getAsObject(params?: any[] | Record<string, any>): Record<string, any>;
    get(params?: any[] | Record<string, any>): any[];
    free(): boolean;
  }

  export default function initSqlJs(config?: any): Promise<SqlJsStatic>;
}
