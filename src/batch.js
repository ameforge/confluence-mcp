// Runs fn once per page ID, in order, and reports every outcome. A failure on
// one ID must not stop the rest, but it must still surface as an error so the
// caller does not take a partly failed batch for a success.
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
