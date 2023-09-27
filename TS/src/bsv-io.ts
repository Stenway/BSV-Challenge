/* (C) Stefan John / Stenway / Stenway.com / 2023 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as fs from 'fs'
import { decodeBsv, encodeBsv } from './bsv.js'

export function saveBsvSync(jaggedArray: (string | null)[][], filePath: string) {
	fs.writeFileSync(filePath, encodeBsv(jaggedArray));
}

export async function saveBsv(jaggedArray: (string | null)[][], filePath: string) {
	await fs.promises.writeFile(filePath, encodeBsv(jaggedArray));
}

export function loadBsvSync(filePath: string): (string | null)[][] {
	return decodeBsv(fs.readFileSync(filePath));
}

export async function loadBsv(filePath: string): Promise<(string | null)[][]> {
	return decodeBsv(await fs.promises.readFile(filePath));
}

export function appendBsvSync(jaggedArray: (string | null)[][], filePath: string) {
	const [handle, existed] = (() => {
		try { return [fs.openSync(filePath, "r+"), true]; }
		catch (error) {
			if ((error as any).code === "ENOENT") { return [fs.openSync(filePath, "wx"), false]; }
			else { throw error; }
		}
	})();
	const write = (bytes: Uint8Array) => { if (fs.writeSync(handle, bytes, 0, bytes.length, fs.fstatSync(handle).size) !== bytes.length) { throw new Error(`Data not fully written`); } }
	try {
		if (existed === true) { write(new Uint8Array([0xFF])); }
		write(encodeBsv(jaggedArray));
	} finally { fs.closeSync(handle); }
}

export async function appendBsv(jaggedArray: (string | null)[][], filePath: string) {
	const [handle, existed] = await (async () => {
		try { return [await fs.promises.open(filePath, "r+"), true]; }
		catch (error) {
			if ((error as any).code === "ENOENT") { return [await fs.promises.open(filePath, "wx"), false]; }
			else { throw error; }
		}
	})();
	const write = async (bytes: Uint8Array) => { if ((await handle.write(bytes, 0, bytes.length, (await handle.stat()).size)).bytesWritten !== bytes.length) { throw new Error(`Data not fully written`); } }
	try {
		if (existed === true) { await write(new Uint8Array([0xFF])); }
		await write(encodeBsv(jaggedArray));
	} finally { await handle.close(); }
}