import { decodeBsv, encodeBsv, isValidUtf16String, joinBytes, splitBytes } from "../src/bsv.js"

describe("joinBytes", () => {
	test.each([
		[[], []],
		[[[]], []],
		[[[], []], []],
		[[[], [], []], []],
		[[[1]], [1]],
		[[[1, 2]], [1, 2]],
		[[[1], [2]], [1, 2]],
		[[[1], [2], [3]], [1, 2, 3]],
	])(
		"%p is %p",
		(input, output) => {
			const bytesArray = input.map((x) => new Uint8Array(x))
			const result = joinBytes(bytesArray)
			expect(result).toEqual(new Uint8Array(output))
		}
	)
})

describe("splitBytes", () => {
	test.each([
		[[], 0, [[]]],
		[[1], 0, [[1]]],
		[[1, 2], 0, [[1, 2]]],
		[[1, 2, 3], 0, [[1, 2, 3]]],
		[[0], 0, [[], []]],
		[[0, 2], 0, [[], [2]]],
		[[0, 2, 3], 0, [[], [2, 3]]],
		[[1, 0, 3], 0, [[1], [3]]],
		[[1, 2, 0], 0, [[1, 2], []]],
		[[0, 0], 0, [[], [], []]],
		[[0, 0, 0], 0, [[], [], [], []]],
		[[0, 1, 0, 2, 0], 0, [[], [1], [2], []]],
		[[1, 0, 2, 0, 3, 0, 4], 0, [[1], [2], [3], [4]]],
		[[1, 2, 0, 3, 4, 0, 5, 6, 0, 7, 8], 0, [[1, 2], [3, 4], [5, 6], [7, 8]]],
		[[1, 0, 3], 1, [[], [0, 3]]],
		[[1, 0, 3], 3, [[1, 0], []]],
	])(
		"%p and %p is %p",
		(input1, input2, output) => {
			const bytes = new Uint8Array(input1)
			const result = splitBytes(bytes, input2)
			expect(result).toEqual(output.map((x) => new Uint8Array(x)))
		}
	)
})

describe("isValidUtf16String", () => {
	test.each([
		["", true],
		["a", true],
		["\uD800\uDC00", true],
		["a\uD800\uDC00", true],
		["\uD800\uDC00a", true],
		["\uDC00", false],
		["\uDC00a", false],
		["\uD800", false],
		["\uD800a", false],
		["\uDC00\uD800", false],
	])(
		"%p is %p",
		(input, output) => {
			const result = isValidUtf16String(input)
			expect(result).toEqual(output)
		}
	)
})

// ----------------------------------------------------------------------

const bB = 0x42
const bS = 0x53
const bV = 0x56

const bLB = 0xFF
const bVS = 0xFE
const bNV = 0xFD
const bES = 0xFC

const bA = 0x41

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
		[[0xF0, 0x90, 0x80, 0x80], [["\uD800\uDC00"]]],
		[[0xEF, 0xBB, 0xBF], [["\uFEFF"]]],
		[[0xEF, 0xBB, 0xBF, bA], [["\uFEFFA"]]],
		[[0xF0, 0x9D, 0x84, 0x9E], [["𝄞"]]],
		[[0xC2, 0xA5, 0xC3, 0xA4, 0xE2, 0x82, 0xAC, 0xE6, 0x9D, 0xB1], [["¥ä€東"]]],
	])(
		"%p is %p",
		(input, output) => {
			const bytes = new Uint8Array([bB, bS, bV, ...input])
			const result = decodeBsv(bytes)
			expect(result).toEqual(output)
			
			const result2 = encodeBsv(result)
			expect(result2).toEqual(bytes)
		}
	)
	
	test.each([
		[[]],
		[[bB]],
		[[bB, bS]],
		[[bB, bS, bV, bVS]],
		[[bB, bS, bV, bA, bVS]],
		[[bB, bS, bV, 0xFB]],
		[[bB, bS, bV, 0xFA]],
		[[bB, bS, bV, 0xF9]],
		[[bB, bS, bV, 0xF8]],
		[[bB, bS, bV, 0xED, 0xBA, 0xAD]],
		[[bB, bS, bV, 0xED, 0xA0, 0x80]],
		[[bB, bS, bV, 0xED, 0xB0, 0x80]],
	])(
		"%p decodeBsv fails",
		(input) => {
			const bytes = new Uint8Array(input)
			expect(() => decodeBsv(bytes)).toThrowError()
		}
	)
	
	test.each([
		["\uDC00"],
		["\uDC00a"],
		["\uD800"],
		["\uD800a"],
		["\uDC00\uD800"],
	])(
		"%p encodeBsv fails",
		(input) => {
			expect(() => encodeBsv([[input]])).toThrowError()
		}
	)
})