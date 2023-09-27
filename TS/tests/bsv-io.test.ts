import { appendBsv, appendBsvSync, loadBsv, loadBsvSync, saveBsv, saveBsvSync } from "../src/bsv-io.js"
import * as fs from 'fs'

function getFilePath(name: string): string {
	return "test_files/"+name
}

const testFilePath: string = getFilePath("Test.bsv")

function deleteFileSync(filePath: string): boolean {
	try {
		fs.unlinkSync(filePath)
	} catch {
		return false
	}
	return true
}

async function deleteFile(filePath: string): Promise<boolean> {
	try {
		await fs.promises.unlink(filePath)
	} catch {
		return false
	}
	return true
}

// ----------------------------------------------------------------------

describe("saveBsvSync + loadBsvSync", () => {
	test.each([
		[[[]]],
		[[["A", "B", null], ["C", ""], ["🌎"]]],
	])(
		"%p",
		(input) => {
			saveBsvSync(input, testFilePath)
			const jaggedArray = loadBsvSync(testFilePath)
			expect(jaggedArray).toEqual(input)
		}
	)
})

describe("saveBsv + loadBsv", () => {
	test.each([
		[[[]]],
		[[["A", "B", null], ["C", ""], ["🌎"]]],
	])(
		"%p",
		async (input) => {
			await saveBsv(input, testFilePath)
			const jaggedArray = await loadBsv(testFilePath)
			expect(jaggedArray).toEqual(input)
		}
	)
})

test("appendBsvSync", () => {
	deleteFileSync(testFilePath)
	appendBsvSync([["abc"]], testFilePath)
	expect(loadBsvSync(testFilePath)).toEqual([["abc"]])
	appendBsvSync([["def"]], testFilePath)
	expect(loadBsvSync(testFilePath)).toEqual([["abc"], ["def"]])
	
	deleteFileSync(testFilePath)
	appendBsvSync([], testFilePath)
	expect(loadBsvSync(testFilePath)).toEqual([[]])
	appendBsvSync([["def"]], testFilePath)
	expect(loadBsvSync(testFilePath)).toEqual([[], ["def"]])
})

test("appendBsv", async () => {
	await deleteFile(testFilePath)
	await appendBsv([["abc"]], testFilePath)
	expect(await loadBsv(testFilePath)).toEqual([["abc"]])
	await appendBsv([["def"]], testFilePath)
	expect(await loadBsv(testFilePath)).toEqual([["abc"], ["def"]])
	
	await deleteFile(testFilePath)
	await appendBsv([], testFilePath)
	expect(await loadBsv(testFilePath)).toEqual([[]])
	await appendBsv([["def"]], testFilePath)
	expect(await loadBsv(testFilePath)).toEqual([[], ["def"]])
})