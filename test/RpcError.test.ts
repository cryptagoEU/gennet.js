import {describe, it, expect} from 'vitest';
import {RpcError} from '../src/types.js';

describe('RpcError', () => {
    it('hat message, code und name', () => {
        const err = new RpcError('Not found', -32601);

        expect(err.message).toBe('Not found');
        expect(err.code).toBe(-32601);
        expect(err.name).toBe('RpcError');
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(RpcError);
    });

    it('hat optionales data', () => {
        const err = new RpcError('Validation failed', -32602, {field: 'name'});

        expect(err.data).toEqual({field: 'name'});
    });

    it('data ist undefined wenn nicht gesetzt', () => {
        const err = new RpcError('Error', -32000);

        expect(err.data).toBeUndefined();
    });
});