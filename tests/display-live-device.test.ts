import test from 'node:test';import assert from 'node:assert/strict';
import {createPairCode,deviceDigest,normalizePairCode,createDeviceSecret} from '../lib/server/display.ts';
test('device pairing: 60-bit alphabet produces twelve uppercase safe chars',()=>{for(let i=0;i<40;i++)assert.match(createPairCode(),/^[A-HJ-NP-Z2-9]{12}$/);});
test('device pairing: formatting normalizes without exposing a token',()=>{const code=createPairCode();assert.equal(normalizePairCode(code.slice(0,4)+'–'+code.slice(4,8)+'-'+code.slice(8)),code);});
test('device pairing: secret and SHA256 digest never match raw token',()=>{const token=createDeviceSecret(),digest=deviceDigest(token);assert.ok(token.length>=42);assert.match(digest,/^[a-f0-9]{64}$/);assert.notEqual(token,digest);});
test('device pairing: malformed codes rejected',()=>{for(const invalid of ['','12345','IIIIIIIIIIII','oooooooooooo','AAAAAAAAAAAAA','abcdefghijklmnop'])assert.equal(normalizePairCode(invalid),null);});
