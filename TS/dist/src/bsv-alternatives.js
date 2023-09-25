/* (C) Stefan John / Stenway / Stenway.com / 2023 */
export function joinBytes(bytesArray) {
    const resultLength = bytesArray.reduce((result, bytes) => result + bytes.length, 0);
    const result = new Uint8Array(resultLength);
    let offset = 0;
    for (const bytes of bytesArray) {
        result.set(bytes, offset);
        offset += bytes.length;
    }
    return result;
}
export function splitBytes(bytes, splitByte) {
    const result = [];
    let lastIndex = -1;
    for (;;) {
        const currentIndex = bytes.indexOf(splitByte, lastIndex + 1);
        if (currentIndex < 0) {
            const part = bytes.subarray(lastIndex + 1);
            result.push(part);
            break;
        }
        else {
            const part = bytes.subarray(lastIndex + 1, currentIndex);
            lastIndex = currentIndex;
            result.push(part);
        }
    }
    return result;
}
export function isValidUtf16String(str) {
    for (let i = 0; i < str.length; i++) {
        const firstCodeUnit = str.charCodeAt(i);
        if (firstCodeUnit >= 0xD800 && firstCodeUnit <= 0xDFFF) {
            if (firstCodeUnit >= 0xDC00) {
                return false;
            }
            i++;
            if (i >= str.length) {
                return false;
            }
            const secondCodeUnit = str.charCodeAt(i);
            if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) {
                return false;
            }
        }
    }
    return true;
}
export function encodeBsv2(jaggedArray) {
    const parts = [];
    const lineBreakByte = new Uint8Array([0xFF]);
    const valueSeparatorByte = new Uint8Array([0xFE]);
    const nullValueByte = new Uint8Array([0xFD]);
    const emptyStringByte = new Uint8Array([0xFC]);
    const encoder = new TextEncoder();
    let wasFirstLine = true;
    for (const line of jaggedArray) {
        if (wasFirstLine === false) {
            parts.push(lineBreakByte);
        }
        wasFirstLine = false;
        let wasFirstValue = true;
        for (const value of line) {
            if (wasFirstValue === false) {
                parts.push(valueSeparatorByte);
            }
            wasFirstValue = false;
            if (value === null) {
                parts.push(nullValueByte);
            }
            else if (value.length === 0) {
                parts.push(emptyStringByte);
            }
            else {
                if (isValidUtf16String(value) === false) {
                    throw new Error(`Invalid string value`);
                }
                parts.push(encoder.encode(value));
            }
        }
    }
    return joinBytes(parts);
}
export function decodeBsv2(bytes) {
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    return splitBytes(bytes, 0xFF).map((lineBytes) => lineBytes.length === 0 ? [] :
        splitBytes(lineBytes, 0xFE).map((valueBytes) => {
            if (valueBytes.length === 0) {
                throw new Error(`Invalid BSV value byte sequence`);
            }
            if (valueBytes.length === 1) {
                const firstByte = valueBytes[0];
                if (firstByte === 0xFD) {
                    return null;
                }
                else if (firstByte === 0xFC) {
                    return "";
                }
            }
            return decoder.decode(valueBytes);
        }));
}
// ----------------------------------------------------------------------
export function encodeBsv3(jaggedArray) {
    const encoder = new TextEncoder();
    return Uint8Array.from(Array.from(jaggedArray.map((line) => line.map((value) => {
        if (value === null) {
            return "\xFD";
        }
        else if (value.length === 0) {
            return "\xFC";
        }
        else {
            if (!/\p{Surrogate}/u.test(value) === false) {
                throw new Error(`Invalid string value`);
            }
            return Array.from(encoder.encode(value)).map((byte) => String.fromCharCode(byte)).join("");
        }
    }).join("\xFE")).join("\xFF")).map((char) => char.charCodeAt(0)));
}
export function decodeBsv3(bytes) {
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    return Array.from(bytes).map((byte) => String.fromCharCode(byte)).join("").
        split("\xFF").map((lineBytesStr) => lineBytesStr.length === 0 ? [] :
        lineBytesStr.split("\xFE").map((valueBytesStr) => {
            if (valueBytesStr.length === 0) {
                throw new Error(`Invalid BSV value byte sequence`);
            }
            else if (valueBytesStr.length === 1 && valueBytesStr.charCodeAt(0) === 0xFD) {
                return null;
            }
            else if (valueBytesStr.length === 1 && valueBytesStr.charCodeAt(0) === 0xFC) {
                return "";
            }
            return decoder.decode(Uint8Array.from(Array.from(valueBytesStr).map((char) => char.charCodeAt(0))));
        }));
}
// ----------------------------------------------------------------------
class BsvUtil {
    static lineBreakByte = 0b11111111;
    static valueSeparatorByte = 0b11111110;
    static nullValueByte = 0b11111101;
    static emptyStringByte = 0b11111100;
}
export { BsvUtil };
export class Uint8ArrayBuilder {
    _buffer;
    _numBytes = 0;
    _utf8Encoder = new TextEncoder();
    constructor(initialSize = 4096) {
        this._buffer = new Uint8Array(initialSize);
    }
    prepare(appendLength) {
        if (this._numBytes + appendLength > this._buffer.length) {
            let newSize = this._buffer.length * 2;
            while (this._numBytes + appendLength > newSize) {
                newSize *= 2;
            }
            const newBuffer = new Uint8Array(newSize);
            newBuffer.set(this._buffer, 0);
            this._buffer = newBuffer;
        }
    }
    push(part) {
        this.prepare(part.length);
        this._buffer.set(part, this._numBytes);
        this._numBytes += part.length;
    }
    pushUtf8String(str) {
        if (isValidUtf16String(str) === false) {
            throw new Error(`Invalid string value`);
        }
        const bytes = this._utf8Encoder.encode(str);
        this.push(bytes);
    }
    pushByte(byte) {
        this.prepare(1);
        this._buffer[this._numBytes] = byte;
        this._numBytes++;
    }
    toArray() {
        return this._buffer.subarray(0, this._numBytes);
    }
}
export class BsvEncoder {
    static internalEncodeValues(values, builder) {
        for (let i = 0; i < values.length; i++) {
            if (i !== 0) {
                builder.pushByte(BsvUtil.valueSeparatorByte);
            }
            const value = values[i];
            if (value === null) {
                builder.pushByte(BsvUtil.nullValueByte);
            }
            else if (value.length === 0) {
                builder.pushByte(BsvUtil.emptyStringByte);
            }
            else {
                builder.pushUtf8String(value);
            }
        }
    }
    static internalEncodeJaggedArray(jaggedArray, builder) {
        let wasFirst = true;
        for (const line of jaggedArray) {
            if (wasFirst === false) {
                builder.pushByte(BsvUtil.lineBreakByte);
            }
            wasFirst = false;
            this.internalEncodeValues(line, builder);
        }
    }
    static encodeJaggedArray(jaggedArray) {
        const builder = new Uint8ArrayBuilder();
        this.internalEncodeJaggedArray(jaggedArray, builder);
        return builder.toArray();
    }
}
export class InvalidBsvError extends Error {
    constructor() {
        super("Document is not a valid BSV document");
    }
}
export class Uint8ArrayReader {
    buffer;
    offset;
    utf8Decoder;
    constructor(buffer, offset) {
        this.buffer = buffer;
        this.offset = offset;
        this.utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    }
    readNonEmptyUtf8String(values) {
        const startOffset = this.offset;
        this.offset++;
        let wasLineBreak = false;
        let wasSeparator = false;
        while (this.offset < this.buffer.length) {
            const currentByte = this.buffer[this.offset];
            if (currentByte === BsvUtil.lineBreakByte) {
                wasLineBreak = true;
                wasSeparator = true;
                break;
            }
            else if (currentByte === BsvUtil.valueSeparatorByte) {
                wasSeparator = true;
                break;
            }
            this.offset++;
        }
        const bytes = this.buffer.subarray(startOffset, this.offset);
        try {
            const value = this.utf8Decoder.decode(bytes);
            values.push(value);
        }
        catch (error) {
            throw new InvalidBsvError();
        }
        if (wasSeparator === true) {
            this.offset++;
        }
        return wasLineBreak;
    }
    read(values) {
        if (this.offset >= this.buffer.length) {
            return undefined;
        }
        const peekByte = this.buffer[this.offset];
        if (peekByte === BsvUtil.lineBreakByte) {
            if (this.offset > 0 && this.buffer[this.offset - 1] === BsvUtil.valueSeparatorByte) {
                throw new InvalidBsvError();
            }
            this.offset++;
            return true;
        }
        if (peekByte === BsvUtil.nullValueByte) {
            values.push(null);
            this.offset++;
        }
        else if (peekByte === BsvUtil.emptyStringByte) {
            values.push("");
            this.offset++;
        }
        else {
            return this.readNonEmptyUtf8String(values);
        }
        if (this.offset < this.buffer.length) {
            const peekFollowingByte = this.buffer[this.offset];
            this.offset++;
            if (peekFollowingByte === BsvUtil.lineBreakByte) {
                return true;
            }
            else if (peekFollowingByte !== BsvUtil.valueSeparatorByte) {
                throw new InvalidBsvError();
            }
        }
        return false;
    }
}
export class BsvDecoder {
    static decodeAsJaggedArray(bytes) {
        if (bytes.length === 0) {
            return [[]];
        }
        const result = [];
        const reader = new Uint8ArrayReader(bytes, 0);
        let currentLine = [];
        if (bytes[0] === BsvUtil.valueSeparatorByte || bytes[bytes.length - 1] === BsvUtil.valueSeparatorByte) {
            throw new InvalidBsvError();
        }
        for (;;) {
            const wasLineBreak = reader.read(currentLine);
            if (wasLineBreak === undefined) {
                break;
            }
            if (wasLineBreak === true) {
                result.push(currentLine);
                currentLine = [];
            }
        }
        result.push(currentLine);
        return result;
    }
}
export function encodeBsv4(jaggedArray) {
    return BsvEncoder.encodeJaggedArray(jaggedArray);
}
export function decodeBsv4(bytes) {
    return BsvDecoder.decodeAsJaggedArray(bytes);
}
//# sourceMappingURL=bsv-alternatives.js.map