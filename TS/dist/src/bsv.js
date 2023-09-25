/* (C) Stefan John / Stenway / Stenway.com / 2023 */
export function encodeBsv(jaggedArray) {
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
                if (!/\p{Surrogate}/u.test(value) === false) {
                    throw new Error(`Invalid string value`);
                }
                parts.push(encoder.encode(value));
            }
        }
    }
    const result = new Uint8Array(parts.reduce((result, bytes) => result + bytes.length, 0));
    let offset = 0;
    for (const bytes of parts) {
        result.set(bytes, offset);
        offset += bytes.length;
    }
    return result;
}
export function decodeBsv(bytes) {
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    const result = [];
    let currentLine = [];
    let lastIndex = -1;
    const indexOfLbOrVs = (lastIndex) => {
        let currentIndex = lastIndex;
        for (;;) {
            if (currentIndex >= bytes.length) {
                return -1;
            }
            if (bytes[currentIndex] >= 0xFE) {
                return currentIndex;
            }
            currentIndex++;
        }
    };
    for (;;) {
        const currentIndex = indexOfLbOrVs(lastIndex + 1);
        const valueBytes = bytes.subarray(lastIndex + 1, currentIndex < 0 ? undefined : currentIndex);
        if (valueBytes.length === 1 && valueBytes[0] === 0xFD) {
            currentLine.push(null);
        }
        else if (valueBytes.length === 1 && valueBytes[0] === 0xFC) {
            currentLine.push("");
        }
        else if (valueBytes.length >= 1) {
            currentLine.push(decoder.decode(valueBytes));
        }
        else if ((((currentIndex >= 0 && bytes[currentIndex] === 0xFF) || (currentIndex < 0)) && ((lastIndex < 0) || (lastIndex >= 0 && bytes[lastIndex] === 0xFF))) === false) {
            throw new Error(`Invalid BSV value byte sequence`);
        }
        if (currentIndex < 0) {
            break;
        }
        else if (currentIndex >= 0 && bytes[currentIndex] === 0xFF) {
            result.push(currentLine);
            currentLine = [];
        }
        lastIndex = currentIndex;
    }
    result.push(currentLine);
    return result;
}
//# sourceMappingURL=bsv.js.map