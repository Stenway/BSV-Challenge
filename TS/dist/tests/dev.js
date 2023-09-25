/* eslint-disable no-console */
import { decodeBsv2, decodeBsv4, encodeBsv2, encodeBsv4 } from "../src/bsv-alternatives.js";
import { encodeBsv, decodeBsv } from "../src/bsv.js";
let startTimeStamp;
function startTime() {
    startTimeStamp = Date.now();
}
function stopTime() {
    return Date.now() - startTimeStamp;
}
const encodeMethods = [encodeBsv, encodeBsv2, encodeBsv4];
const decodeMethods = [decodeBsv, decodeBsv2, decodeBsv4];
function getJaggedArray(size, size2) {
    const result = [];
    for (let i = 0; i < size; i++) {
        const line = [];
        line.push(i.toString());
        for (let j = 0; j < size2; j++) {
            line.push("abc".repeat(100));
        }
        result.push(line);
    }
    return result;
}
const runs = 10;
for (let i = 0; i < encodeMethods.length; i++) {
    let encodeTotal = 0;
    let decodeTotal = 0;
    for (let r = 0; r < runs; r++) {
        const jaggedArray = getJaggedArray(100000, 10);
        jaggedArray.push([r.toString()]);
        const encodeMethod = encodeMethods[i];
        const decodeMethod = decodeMethods[i];
        startTime();
        const bytes = encodeMethod(jaggedArray);
        encodeTotal += stopTime();
        startTime();
        decodeMethod(bytes);
        decodeTotal += stopTime();
        console.log(".");
    }
    console.log(`encode: ${encodeTotal / runs}`);
    console.log(`decode: ${decodeTotal / runs}`);
}
// -------------------
console.log("Dev");
//# sourceMappingURL=dev.js.map