/* (C) Stefan John / Stenway / Stenway.com / 2023 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import { decodeBsv, encodeBsv } from './bsv.js';
export function saveBsvSync(jaggedArray, filePath) {
    fs.writeFileSync(filePath, encodeBsv(jaggedArray));
}
export async function saveBsv(jaggedArray, filePath) {
    await fs.promises.writeFile(filePath, encodeBsv(jaggedArray));
}
export function loadBsvSync(filePath) {
    return decodeBsv(fs.readFileSync(filePath));
}
export async function loadBsv(filePath) {
    return decodeBsv(await fs.promises.readFile(filePath));
}
export function appendBsvSync(jaggedArray, filePath) {
    const [handle, existed] = (() => {
        try {
            return [fs.openSync(filePath, "r+"), true];
        }
        catch (error) {
            if (error.code === "ENOENT") {
                return [fs.openSync(filePath, "wx"), false];
            }
            else {
                throw error;
            }
        }
    })();
    const write = (bytes) => { if (fs.writeSync(handle, bytes, 0, bytes.length, fs.fstatSync(handle).size) !== bytes.length) {
        throw new Error(`Data not fully written`);
    } };
    try {
        if (existed === true) {
            write(new Uint8Array([0xFF]));
        }
        write(encodeBsv(jaggedArray));
    }
    finally {
        fs.closeSync(handle);
    }
}
export async function appendBsv(jaggedArray, filePath) {
    const [handle, existed] = await (async () => {
        try {
            return [await fs.promises.open(filePath, "r+"), true];
        }
        catch (error) {
            if (error.code === "ENOENT") {
                return [await fs.promises.open(filePath, "wx"), false];
            }
            else {
                throw error;
            }
        }
    })();
    const write = async (bytes) => { if ((await handle.write(bytes, 0, bytes.length, (await handle.stat()).size)).bytesWritten !== bytes.length) {
        throw new Error(`Data not fully written`);
    } };
    try {
        if (existed === true) {
            await write(new Uint8Array([0xFF]));
        }
        await write(encodeBsv(jaggedArray));
    }
    finally {
        await handle.close();
    }
}
//# sourceMappingURL=bsv-io.js.map