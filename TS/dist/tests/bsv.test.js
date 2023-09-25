import { decodeBsv, encodeBsv } from "../src/bsv.js";
const bLB = 0xFF;
const bVS = 0xFE;
const bNV = 0xFD;
const bES = 0xFC;
const bA = 0x41;
const bB = 0x42;
describe("decodeBsv + encodeBsv", () => {
    test.each([
        [[], [[]]],
        [[bA], [["A"]]],
        [[bA, bB], [["AB"]]],
        [[bA, bVS, bB], [["A", "B"]]],
        [[bNV], [[null]]],
        [[bES], [[""]]],
        [[bLB], [[], []]],
        [[bLB, bLB], [[], [], []]],
        [[bA, bLB, bLB], [["A"], [], []]],
        [[bLB, bA, bLB], [[], ["A"], []]],
        [[bLB, bLB, bA], [[], [], ["A"]]],
        [[bNV, bLB, bLB], [[null], [], []]],
        [[bLB, bNV, bLB], [[], [null], []]],
        [[bLB, bLB, bNV], [[], [], [null]]],
        [[0xF0, 0x90, 0x80, 0x80], [["\uD800\uDC00"]]],
        [[0xEF, 0xBB, 0xBF], [["\uFEFF"]]],
        [[0xEF, 0xBB, 0xBF, 0xEF, 0xBB, 0xBF], [["\uFEFF\uFEFF"]]],
        [[0xEF, 0xBB, 0xBF, bA], [["\uFEFFA"]]],
        [[0xF0, 0x9D, 0x84, 0x9E], [["𝄞"]]],
        [[0xC2, 0xA5, 0xC3, 0xA4, 0xE2, 0x82, 0xAC, 0xE6, 0x9D, 0xB1], [["¥ä€東"]]],
        [Array(10000).fill(bA), [["A".repeat(10000)]]],
    ])("%p is %p", (input, output) => {
        const bytes = new Uint8Array(input);
        const result = decodeBsv(bytes);
        expect(result).toEqual(output);
        const result2 = encodeBsv(result);
        expect(result2).toEqual(bytes);
    });
    test.each([
        [[0xFB]],
        [[0xFA]],
        [[0xF9]],
        [[0xF8]],
        [[0xED, 0xBA, 0xAD]],
        [[0xED, 0xA0, 0x80]],
        [[0xED, 0xB0, 0x80]],
        [[0xC2]],
        [[0xE6, 0x9D]],
        [[bVS]],
        [[bNV, bNV]],
        [[bES, bES]],
        [[bNV, bES]],
        [[bES, bNV]],
        [[bLB, bES, bNV]],
        [[bLB, bNV, bNV]],
        [[bLB, bES, bES]],
        [[bLB, bNV, bES]],
        [[bLB, bES, bNV]],
        [[bNV, bVS]],
        [[bES, bVS]],
        [[bA, bVS]],
        [[bNV, bVS, bVS]],
        [[bNV, bVS, bLB]],
        [[bA, bVS, bVS]],
        [[bA, bVS, bLB]],
        [[bVS, bVS]],
        [[bA, bVS, bVS]],
    ])("%p decodeBsv fails", (input) => {
        const bytes = new Uint8Array(input);
        expect(() => decodeBsv(bytes)).toThrowError();
    });
    test.each([
        ["\uDC00"],
        ["\uDC00a"],
        ["\uD800"],
        ["\uD800a"],
        ["\uDC00\uD800"],
    ])("%p encodeBsv fails", (input) => {
        expect(() => encodeBsv([[input]])).toThrowError();
    });
});
//# sourceMappingURL=bsv.test.js.map