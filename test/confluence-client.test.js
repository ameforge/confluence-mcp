import assert from "node:assert/strict";
import {test} from "node:test";
import {confluenceRequest} from "../src/confluence-client.js";

// Answers each call with the next status in `statuses`; the last one repeats.
const stubStatuses = (statuses) => {
  const methods = [];
  globalThis.fetch = async (_url, init) => {
    const status = statuses[Math.min(methods.length, statuses.length - 1)];
    methods.push(init.method);
    return {
      json: async () => ({id: "1"}),
      ok: status < 400,
      status,
      text: async () => "busy",
    };
  };
  return methods;
};

test("a GET that hits a transient 503 is retried", async () => {
  const methods = stubStatuses([503, 200]);
  assert.deepEqual(await confluenceRequest("GET", "/content/1"), {id: "1"});
  assert.deepEqual(methods, ["GET", "GET"]);
});

test("a write that hits a 503 is never replayed", async () => {
  const methods = stubStatuses([503, 200]);
  await assert.rejects(
    confluenceRequest("PUT", "/content/1", {}),
    /Confluence API 503: busy/,
  );
  assert.deepEqual(methods, ["PUT"]);
});

// A timed-out write may have been saved; only a GET may be retried.
for (const [method, says] of [
  ["PUT", /PUT within 30s; it may still have been saved, so do not retry/],
  ["GET", /within 30s; safe to retry/],
]) {
  test(`a timed-out ${method} says what it means for a retry`, async () => {
    globalThis.fetch = async () => {
      throw new DOMException(
        "The operation was aborted due to timeout",
        "TimeoutError",
      );
    };
    await assert.rejects(confluenceRequest(method, "/content/1", {}), says);
  });
}
