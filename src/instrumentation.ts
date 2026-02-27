export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Suppress url.parse() deprecation warning from @kubernetes/client-node
    // The library uses url.parse() internally and there's no fix on our end.
    const originalEmit = process.emit;
    // @ts-expect-error - patching process.emit to filter deprecation warnings
    process.emit = function (event: string, ...args: unknown[]) {
      if (
        event === "warning" &&
        typeof args[0] === "object" &&
        args[0] !== null &&
        (args[0] as { name?: string }).name === "DeprecationWarning" &&
        (args[0] as { message?: string }).message?.includes("url.parse()")
      ) {
        return false;
      }
      return originalEmit.apply(process, [event, ...args] as Parameters<typeof process.emit>);
    };

    // Start the terminal WebSocket server for pod exec
    const { startTerminalServer } = await import("@/lib/terminal-server");
    startTerminalServer();
  }
}
