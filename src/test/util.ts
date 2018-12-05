/**
 * Call to begin capturing all output. Call the returned function to
 * stop capturing output and get the contents as a string.
 *
 * Captures output from console.log and friends. Does not capture plylog, which
 * doesn't seem to be very easy to intercept.
 */
export async function interceptOutput(captured: () => Promise<void>):
  Promise<string> {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const buffer: string[] = [];
  const capture = (...args: {}[]) => {
    buffer.push(args.join(' '));
  };
  console.log = capture;
  console.error = capture;
  console.warn = capture;
  const restoreAndGetOutput = () => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    return buffer.join('\n');
  };
  try {
    await captured();
  } catch (err) {
    const output = restoreAndGetOutput();
    console.error(output);
    throw err;
  }

  return restoreAndGetOutput();
}
