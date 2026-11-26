// A failed ID must not stop the rest, but the batch still throws so a partial failure is not a success.
export const runBatch = async (ids, fn) => {
  const lines = [];
  let failed = 0;
  for (const raw of ids) {
    const id = raw.trim();
    try {
      lines.push(await fn(id));
    } catch (err) {
      failed++;
      lines.push(`${id} failed: ${err.message}`);
    }
  }
  const text = lines.join("\n");
  if (failed) throw new Error(`${failed} of ${lines.length} failed\n${text}`);
  return text;
};
