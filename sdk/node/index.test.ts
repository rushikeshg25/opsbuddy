import { test, expect } from "bun:test";
import { OpsBuddySDK, type CapturedLog } from "./src/index";

test("default interval flushes in bounded batches and serializes concurrent flushes", async () => {
  const sdk = new OpsBuddySDK({
    serviceId: "1",
    authToken: "test",
    batchSize: 2,
  });
  const internals = sdk as unknown as { capturedLogs: CapturedLog[] };
  internals.capturedLogs = Array.from({ length: 5 }, (_, i) => ({
    timestamp: "",
    level: "INFO",
    message: String(i),
  }));
  const batches: number[] = [];
  sdk.ingestLogs = async (logs) => {
    batches.push(logs.length);
    await Promise.resolve();
    return { success: true };
  };
  await Promise.all([sdk.flush(), sdk.flush()]);
  expect(batches).toEqual([2, 2, 1]);
  expect(sdk.getCapturedLogs()).toEqual([]);
  await sdk.close();
});

test("failure retains queued logs without generating recursive diagnostics", async () => {
  const sdk = new OpsBuddySDK({ serviceId: "1", authToken: "test" });
  const internals = sdk as unknown as { capturedLogs: CapturedLog[] };
  internals.capturedLogs = [
    { timestamp: "", level: "INFO", message: "retain me" },
  ];
  sdk.ingestLogs = async () => {
    throw new Error("offline");
  };
  await sdk.flush();
  expect(sdk.getCapturedLogs()).toHaveLength(1);
  await sdk.close();
});

test("invalid batch configuration is rejected before creating resources", () => {
  expect(
    () => new OpsBuddySDK({ serviceId: "1", authToken: "test", batchSize: 0 }),
  ).toThrow(RangeError);
});

test("queue saturation drops new records and circular values do not crash capture", async () => {
  const sdk = new OpsBuddySDK({
    serviceId: "1",
    authToken: "test",
    batchSize: 10,
    maxQueueSize: 2,
  });
  const capture = sdk as unknown as {
    capture: (level: string, args: unknown[]) => void;
  };
  const circular: { self?: unknown } = {};
  circular.self = circular;
  capture.capture("INFO", [circular]);
  capture.capture("INFO", ["second"]);
  capture.capture("INFO", ["overflow"]);
  expect(sdk.getCapturedLogs()).toHaveLength(2);
  expect(sdk.getDroppedLogCount()).toBe(1);
  sdk.ingestLogs = async () => ({ success: true });
  await sdk.close();
});
