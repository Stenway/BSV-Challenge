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
// ----------------------------------------------------------------------
export function decodeBsv(bytes) {
    if (bytes.length < 3 || bytes[0] !== 0x42 || bytes[1] !== 0x53 || bytes[2] !== 0x56) {
        throw new Error(`No valid BSV preamble`);
    }
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    return splitBytes(bytes.subarray(3), 0xFF).map((lineBytes) => lineBytes.length === 0 ? [] :
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
export function encodeBsv(jaggedArray) {
    const parts = [new Uint8Array([0x42, 0x53, 0x56])];
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
//# sourceMappingURL=bsv.js.map