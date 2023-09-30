/* eslint-disable no-console */
import * as fs from 'fs';
export function encodeBsv(jaggedArray) { const parts = []; const lineBreakByte = new Uint8Array([0xFF]); const valueSeparatorByte = new Uint8Array([0xFE]); const nullValueByte = new Uint8Array([0xFD]); const emptyStringByte = new Uint8Array([0xFC]); const encoder = new TextEncoder(); let isFirstLine = true; for (const line of jaggedArray) {
    if (isFirstLine === false) {
        parts.push(lineBreakByte);
    }
    isFirstLine = false;
    let isFirstValue = true;
    for (const value of line) {
        if (isFirstValue === false) {
            parts.push(valueSeparatorByte);
        }
        isFirstValue = false;
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
} const result = new Uint8Array(parts.reduce((result, bytes) => result + bytes.length, 0)); let offset = 0; for (const bytes of parts) {
    result.set(bytes, offset);
    offset += bytes.length;
} return result; }
export function decodeBsv(bytes) { const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }); const result = []; let currentLine = []; let currentIndex = -1; for (;;) {
    const lastIndex = currentIndex;
    for (;;) {
        currentIndex++;
        if (currentIndex >= bytes.length) {
            currentIndex = -1;
            break;
        }
        if (bytes[currentIndex] >= 0xFE) {
            break;
        }
    }
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
} result.push(currentLine); return result; }
export function saveBsvSync(jaggedArray, filePath) { fs.writeFileSync(filePath, encodeBsv(jaggedArray)); }
export function loadBsvSync(filePath) { return decodeBsv(fs.readFileSync(filePath)); }
const jaggedArray = [
    ["Hello", "🌎"],
    ["Line 1\nLine 2", null, ""],
    [],
    ["a,b,c\r\nd,e", "a\tb\tc\nd\te", `"Hello world",""`, "𝄞"]
];
saveBsvSync(jaggedArray, "Test.bsv");
const loaded = loadBsvSync("Test.bsv");
console.log(JSON.stringify(loaded));
//# sourceMappingURL=example.js.map