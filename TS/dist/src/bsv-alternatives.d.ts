export declare function joinBytes(bytesArray: Uint8Array[]): Uint8Array;
export declare function splitBytes(bytes: Uint8Array, splitByte: number): Uint8Array[];
export declare function isValidUtf16String(str: string): boolean;
export declare function encodeBsv2(jaggedArray: (string | null)[][]): Uint8Array;
export declare function decodeBsv2(bytes: Uint8Array): (string | null)[][];
export declare function encodeBsv3(jaggedArray: (string | null)[][]): Uint8Array;
export declare function decodeBsv3(bytes: Uint8Array): (string | null)[][];
export declare abstract class BsvUtil {
    static readonly lineBreakByte = 255;
    static readonly valueSeparatorByte = 254;
    static readonly nullValueByte = 253;
    static readonly emptyStringByte = 252;
}
export declare class Uint8ArrayBuilder {
    private _buffer;
    private _numBytes;
    private _utf8Encoder;
    constructor(initialSize?: number);
    private prepare;
    push(part: Uint8Array): void;
    pushUtf8String(str: string): void;
    pushByte(byte: number): void;
    toArray(): Uint8Array;
}
export declare abstract class BsvEncoder {
    static internalEncodeValues(values: (string | null)[], builder: Uint8ArrayBuilder): void;
    static internalEncodeJaggedArray(jaggedArray: (string | null)[][], builder: Uint8ArrayBuilder): void;
    static encodeJaggedArray(jaggedArray: (string | null)[][]): Uint8Array;
}
export declare class InvalidBsvError extends Error {
    constructor();
}
export declare class Uint8ArrayReader {
    buffer: Uint8Array;
    offset: number;
    private utf8Decoder;
    constructor(buffer: Uint8Array, offset: number);
    private readNonEmptyUtf8String;
    read(values: (string | null)[]): boolean | undefined;
}
export declare abstract class BsvDecoder {
    static decodeAsJaggedArray(bytes: Uint8Array): (string | null)[][];
}
export declare function encodeBsv4(jaggedArray: (string | null)[][]): Uint8Array;
export declare function decodeBsv4(bytes: Uint8Array): (string | null)[][];
//# sourceMappingURL=bsv-alternatives.d.ts.map