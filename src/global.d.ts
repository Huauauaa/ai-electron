declare global {
  interface Window {
    jarRunner?: {
      runJar: (request: {
        jarPath: string;
        jvmArgs: string[];
        programArgs: string[];
        javaBinary?: string;
        cwd?: string;
        timeoutMs?: number;
      }) => Promise<{
        code: number | null;
        signal: string | null;
        stdout: string;
        stderr: string;
        timedOut: boolean;
      }>;
    };
    workHourTool?: {
      list: () => Promise<{
        rows: {
          api_id: number;
          payload: string;
          fetched_at: number;
        }[];
      }>;
      refresh: (request: { loginUrl: string; workHourUrl: string }) => Promise<{
        inserted: number;
        rows: {
          api_id: number;
          payload: string;
          fetched_at: number;
        }[];
      }>;
    };
  }
}

export {};
