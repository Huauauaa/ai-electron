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
  }
}

export {};
