import { test } from "bun:test";
import assert from "node:assert/strict";
import { parseLog } from "../lib/log-format";
test("handles SDK messages and structured logs", () => {
  assert.deepEqual(parseLog("[ERROR] database offline"), {
    level: "error",
    message: "database offline",
  });
  assert.deepEqual(parseLog('{"level":"WARN","message":"retry"}'), {
    level: "warn",
    message: "retry",
  });
});
test("JSON primitives and non-string fields remain renderable", () => {
  for (const raw of ["null", "12", "[]", '{"message":{"nested":true}}'])
    assert.equal(typeof parseLog(raw).message, "string");
});
