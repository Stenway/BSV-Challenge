/* (C) Stefan John / Stenway / Stenway.com / 2023 */

export function joinBytes(bytesArray: Uint8Array[]): Uint8Array {
	const resultLength = bytesArray.reduce((result, bytes) => result + bytes.length, 0)
	const result = new Uint8Array(resultLength)
	let offset = 0
	for (const bytes of bytesArray) {
		result.set(bytes, offset)
		offset += bytes.length
	}
	return result
}

export function splitBytes(bytes: Uint8Array, splitByte: number): Uint8Array[] {
	const result: Uint8Array[] = []
	let lastIndex = -1
	for (;;) {
		const currentIndex = bytes.indexOf(splitByte, lastIndex+1)
		if (currentIndex < 0) {
			const part = bytes.subarray(lastIndex+1)
			result.push(part)
			break
		} else {
			const part = bytes.subarray(lastIndex+1, currentIndex)
			lastIndex = currentIndex
			result.push(part)
		}
	}
	return result
}

export function isValidUtf16String(str: string): boolean {
	for (let i=0; i<str.length; i++) {
		const firstCodeUnit: number = str.charCodeAt(i)
		if (firstCodeUnit >= 0xD800 && firstCodeUnit <= 0xDFFF) {
			if (firstCodeUnit >= 0xDC00) { return false }
			i++
			if (i >= str.length) { return false }
			const secondCodeUnit: number = str.charCodeAt(i)
			if (!(secondCodeUnit >= 0xDC00 && secondCodeUnit <= 0xDFFF)) { return false }
		}
	}
	return true
}

export function encodeBsv2(jaggedArray: (string | null)[][]): Uint8Array {
	const parts: Uint8Array[] = []
	const lineBreakByte = new Uint8Array([0xFF])
	const valueSeparatorByte = new Uint8Array([0xFE])
	const nullValueByte = new Uint8Array([0xFD])
	const emptyStringByte = new Uint8Array([0xFC])
	const encoder = new TextEncoder()
	let wasFirstLine = true
	for (const line of jaggedArray) {
		if (wasFirstLine === false) { parts.push(lineBreakByte) }
		wasFirstLine = false
		let wasFirstValue = true
		for (const value of line) {
			if (wasFirstValue === false) { parts.push(valueSeparatorByte) }
			wasFirstValue = false
			if (value === null) { parts.push(nullValueByte) }
			else if (value.length === 0) { parts.push(emptyStringByte) }
			else {
				if (isValidUtf16String(value) === false) { throw new Error(`Invalid string value`) }
				parts.push(encoder.encode(value))
			}
		}
	}
	return joinBytes(parts)
}

export function decodeBsv2(bytes: Uint8Array): (string | null)[][] {
	const decoder = new TextDecoder("utf-8", {fatal: true, ignoreBOM: true})
	return splitBytes(bytes, 0xFF).map((lineBytes) => lineBytes.length === 0 ? [] :
		splitBytes(lineBytes, 0xFE).map((valueBytes) => {
			if (valueBytes.length === 0) { throw new Error(`Invalid BSV value byte sequence`) }
			if (valueBytes.length === 1) {
				const firstByte = valueBytes[0]
				if (firstByte === 0xFD) { return null }
				else if (firstByte === 0xFC) { return "" }
			}
			return decoder.decode(valueBytes)
		})
	)
}

// ----------------------------------------------------------------------

export function encodeBsv3(jaggedArray: (string | null)[][]): Uint8Array {
	const encoder = new TextEncoder()
	return Uint8Array.from(Array.from(jaggedArray.map((line) => 
		line.map((value) => {
			if (value === null) { return "\xFD" }
			else if (value.length === 0) { return "\xFC" }
			else {
				if (!/\p{Surrogate}/u.test(value) === false) { throw new Error(`Invalid string value`) }
				return Array.from(encoder.encode(value)).map((byte) => String.fromCharCode(byte)).join("")
			}
		}).join("\xFE")
	).join("\xFF")).map((char) => char.charCodeAt(0)))
}

export function decodeBsv3(bytes: Uint8Array): (string | null)[][] {
	const decoder = new TextDecoder("utf-8", {fatal: true, ignoreBOM: true})
	return Array.from(bytes).map((byte) => String.fromCharCode(byte)).join("").
		split("\xFF").map((lineBytesStr) => lineBytesStr.length === 0 ? [] :
			lineBytesStr.split("\xFE").map((valueBytesStr) => {
				if (valueBytesStr.length === 0) { throw new Error(`Invalid BSV value byte sequence`) }
				else if (valueBytesStr.length === 1 && valueBytesStr.charCodeAt(0) === 0xFD) { return null }
				else if (valueBytesStr.length === 1 && valueBytesStr.charCodeAt(0) === 0xFC) { return "" }
				return decoder.decode(Uint8Array.from(Array.from(valueBytesStr).map((char) => char.charCodeAt(0))))
			})
		)
}

// ----------------------------------------------------------------------

export abstract class BsvUtil {
	static readonly lineBreakByte = 0b11111111
	static readonly valueSeparatorByte = 0b11111110
	static readonly nullValueByte = 0b11111101
	static readonly emptyStringByte = 0b11111100
}

export class Uint8ArrayBuilder {
	private _buffer: Uint8Array
	private _numBytes: number = 0
	private _utf8Encoder = new TextEncoder()

	constructor(initialSize: number = 4096) {
		this._buffer = new Uint8Array(initialSize)
	}

	private prepare(appendLength: number) {
		if (this._numBytes + appendLength > this._buffer.length) {
			let newSize = this._buffer.length * 2
			while (this._numBytes + appendLength > newSize) {
				newSize *= 2
			}
			const newBuffer = new Uint8Array(newSize)
			newBuffer.set(this._buffer, 0)
			this._buffer = newBuffer
		}
	}
	
	push(part: Uint8Array) {
		this.prepare(part.length)
		this._buffer.set(part, this._numBytes)
		this._numBytes += part.length
	}

	pushUtf8String(str: string) {
		if (isValidUtf16String(str) === false) { throw new Error(`Invalid string value`) }
		const bytes = this._utf8Encoder.encode(str)
		this.push(bytes)
	}

	pushByte(byte: number) {
		this.prepare(1)
		this._buffer[this._numBytes] = byte
		this._numBytes++
	}

	toArray(): Uint8Array {
		return this._buffer.subarray(0, this._numBytes)
	}
}

export abstract class BsvEncoder {
	static internalEncodeValues(values: (string | null)[], builder: Uint8ArrayBuilder) {
		for (let i=0; i<values.length; i++) {
			if (i !== 0) {
				builder.pushByte(BsvUtil.valueSeparatorByte)
			}
			const value = values[i]
			if (value === null) {
				builder.pushByte(BsvUtil.nullValueByte)
			} else if (value.length === 0) {
				builder.pushByte(BsvUtil.emptyStringByte)
			} else {
				builder.pushUtf8String(value)
			}
		}
	}

	static internalEncodeJaggedArray(jaggedArray: (string | null)[][], builder: Uint8ArrayBuilder) {
		let wasFirst = true
		for (const line of jaggedArray) {
			if (wasFirst === false) {
				builder.pushByte(BsvUtil.lineBreakByte)
			}
			wasFirst = false
			this.internalEncodeValues(line, builder)
		}
	}
	
	static encodeJaggedArray(jaggedArray: (string | null)[][]): Uint8Array {
		const builder: Uint8ArrayBuilder = new Uint8ArrayBuilder()
		this.internalEncodeJaggedArray(jaggedArray, builder)
		return builder.toArray()
	}
}

export class InvalidBsvError extends Error {
	constructor() {
		super("Document is not a valid BSV document")
	}
}

export class Uint8ArrayReader {
	buffer: Uint8Array
	offset: number
	private utf8Decoder: TextDecoder
	
	constructor(buffer: Uint8Array, offset: number) {
		this.buffer = buffer
		this.offset = offset
		this.utf8Decoder = new TextDecoder("utf-8", {fatal: true, ignoreBOM: true})
	}
	
	private readNonEmptyUtf8String(values: (string | null)[]): boolean {
		const startOffset = this.offset
		this.offset++
		let wasLineBreak: boolean = false
		let wasSeparator: boolean = false
		while (this.offset < this.buffer.length) {
			const currentByte = this.buffer[this.offset]
			if (currentByte === BsvUtil.lineBreakByte) {
				wasLineBreak = true
				wasSeparator = true
				break
			} else if (currentByte === BsvUtil.valueSeparatorByte) {
				wasSeparator = true
				break
			}
			this.offset++
		}
		const bytes = this.buffer.subarray(startOffset, this.offset)
		try {
			const value = this.utf8Decoder.decode(bytes)
			values.push(value)
		} catch (error) {
			throw new InvalidBsvError()
		}
		if (wasSeparator === true) {
			this.offset++
		}
		return wasLineBreak
	}

	read(values: (string | null)[]): boolean | undefined {
		if (this.offset >= this.buffer.length) { return undefined }
		const peekByte = this.buffer[this.offset]

		if (peekByte === BsvUtil.lineBreakByte) {
			if (this.offset > 0 && this.buffer[this.offset-1] === BsvUtil.valueSeparatorByte) { throw new InvalidBsvError() }
			this.offset++
			return true
		}
		
		if (peekByte === BsvUtil.nullValueByte) {
			values.push(null)
			this.offset++
		} else if (peekByte === BsvUtil.emptyStringByte) {
			values.push("")
			this.offset++
		} else {
			return this.readNonEmptyUtf8String(values)
		}

		if (this.offset < this.buffer.length) {
			const peekFollowingByte = this.buffer[this.offset]
			this.offset++
			if (peekFollowingByte === BsvUtil.lineBreakByte) {
				return true
			} else if (peekFollowingByte !== BsvUtil.valueSeparatorByte) {
				throw new InvalidBsvError()
			}
		}
		return false
	}
}

export abstract class BsvDecoder {
	static decodeAsJaggedArray(bytes: Uint8Array): (string | null)[][] {
		if (bytes.length === 0) { return [[]] }
		const result: (string | null)[][] = []
		const reader = new Uint8ArrayReader(bytes, 0)
		let currentLine: (string | null)[] = []
		if (bytes[0] === BsvUtil.valueSeparatorByte || bytes[bytes.length-1] === BsvUtil.valueSeparatorByte) { throw new InvalidBsvError() }
		for (;;) {
			const wasLineBreak = reader.read(currentLine)
			if (wasLineBreak === undefined) {
				break
			}
			if (wasLineBreak === true) {
				result.push(currentLine)
				currentLine = []
			}
		}
		result.push(currentLine)
		return result
	}
}

export function encodeBsv4(jaggedArray: (string | null)[][]): Uint8Array {
	return BsvEncoder.encodeJaggedArray(jaggedArray)
}

export function decodeBsv4(bytes: Uint8Array): (string | null)[][] {
	return BsvDecoder.decodeAsJaggedArray(bytes)
}