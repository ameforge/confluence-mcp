import assert from "node:assert/strict";
import {test} from "node:test";
import {confluenceRequest} from "../src/confluence-client.js";

// Retries, timeouts and empty bodies are tested once in packages/request.
// Here: Confluence replays only GET, read through the timeout message that
// uses the same list; a 500 or a timeout on a write may come after it saved.
for (const [method, says] of [
  [
    "PUT",
    /^Confluence did not answer the PUT within 30s; it may still have been saved, so do not retry/,
  ],
  ["GET", /within 30s; safe to retry/],
]) {
  test(`a timed-out ${method} says what it means for a retry`, async () => {
    globalThis.fetch = async () => {
      throw new DOMException(
        "The operation was aborted due to timeout",
        "TimeoutError",
      );
    };
    await assert.rejects(confluenceRequest(method, "/content/1", {}), {
      message: says,
    });
  });
}
