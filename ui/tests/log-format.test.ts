import { test, expect } from 'bun:test';
import { parseLog } from '../lib/log-format';
test('handles SDK messages and structured logs', () => {
 expect(parseLog('[ERROR] database offline')).toEqual({level:'error',message:'database offline'});
 expect(parseLog('{"level":"WARN","message":"retry"}')).toEqual({level:'warn',message:'retry'});
});
test('JSON primitives and non-string fields remain renderable', () => {
 for (const raw of ['null','12','[]','{"message":{"nested":true}}']) expect(typeof parseLog(raw).message).toBe('string');
});
