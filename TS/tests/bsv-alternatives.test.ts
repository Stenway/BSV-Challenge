import { decodeBsv2, decodeBsv3, decodeBsv4, encodeBsv2, encodeBsv3, encodeBsv4, isValidUtf16String, joinBytes, splitBytes } from "../src/bsv-alternatives.js"

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

function isValidUtf16String2(str: string): boolean {
	return !/\p{Surrogate}/u.test(str)
}

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
	
	test("RegEx comparison", () => {
		for (let i=0; i<=0xD7FF; i++) {
			const str = String.fromCodePoint(i)
			const result = isValidUtf16String(str)
			if (result === false || result !== isValidUtf16String2(str)) { throw new Error() }
		}
		for (let i=0xD800; i<=0xDBFF; i++) {
			const str = String.fromCodePoint(i) + "\uDC00"
			const result = isValidUtf16String(str)
			if (result === false || result !== isValidUtf16String2(str)) { throw new Error() }
		}
		for (let i=0xD800; i<=0xDBFF; i++) {
			const str = String.fromCodePoint(i) + "\uDFFF"
			const result = isValidUtf16String(str)
			if (result === false || result !== isValidUtf16String2(str)) { throw new Error() }
		}
		for (let i=0xE000; i<0x110000; i++) {
			const str = String.fromCodePoint(i)
			const result = isValidUtf16String(str)
			if (result === false || result !== isValidUtf16String2(str)) { throw new Error() }
		}
		
		for (let i=0xD800; i<=0xDFFF; i++) {
			const str = String.fromCodePoint(i)
			const result = isValidUtf16String(str)
			if (result === true || result !== isValidUtf16String2(str)) { throw new Error() }
		}
	})
})

// ----------------------------------------------------------------------

const encodeMethods = [encodeBsv2, encodeBsv3, encodeBsv4]
const decodeMethods = [decodeBsv2, decodeBsv3, decodeBsv4]

// ----------------------------------------------------------------------

const bLB = 0xFF
const bVS = 0xFE
const bNV = 0xFD
const bES = 0xFC

const bA = 0x41
const bB = 0x42

describe("decodeBsvX + encodeBsvX", () => {
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
	])(
		"%p is %p",
		(input, output) => {
			for (let i=0; i<encodeMethods.length; i++) {
				const encodeMethod = encodeMethods[i]
				const decodeMethod = decodeMethods[i]
				
				const bytes = new Uint8Array(input)
				const result = decodeMethod(bytes)
				expect(result).toEqual(output)
				
				const result2 = encodeMethod(result)
				expect(result2).toEqual(bytes)
			}
		}
	)
	
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
	])(
		"%p decodeBsvX fails",
		(input) => {
			const bytes = new Uint8Array(input)
			for (const decodeMethod of decodeMethods) {
				expect(() => decodeMethod(bytes)).toThrowError()
			}
		}
	)
	
	test.each([
		["\uDC00"],
		["\uDC00a"],
		["\uD800"],
		["\uD800a"],
		["\uDC00\uD800"],
	])(
		"%p encodeBsvX fails",
		(input) => {
			for (const encodeMethod of encodeMethods) {
				expect(() => encodeMethod([[input]])).toThrowError()
			}
		}
	)
})