import Foundation

func encodeBsv(_ jaggedArray: [[String?]]) -> [UInt8] {
	var result: [UInt8] = []
	var isFirstLine = true
	for line in jaggedArray {
		if !isFirstLine { result.append(0xFF) }
		isFirstLine = false
		var isFirstValue = true
		for value in line {
			if !isFirstValue { result.append(0xFE) }
			isFirstValue = false
			if let strValue = value {
				if strValue.isEmpty { result.append(0xFC) }
				else {
					let valueBytes = [UInt8](strValue.utf8)
					result.append(contentsOf: valueBytes)
				}
			} else {
				result.append(0xFD)
			}
		}
	}
	return result
}

func decodeBsv(_ bytes: [UInt8]) -> [[String?]] {
	var result: [[String?]] = []
	var currentLine: [String?] = []
	var currentIndex: Int = -1
	while true {
		let lastIndex = currentIndex
		var valueBytesLength: Int = 0
		while true {
			currentIndex += 1
			if currentIndex >= bytes.count {
				currentIndex = -1
				valueBytesLength = bytes.count - lastIndex - 1
				break
			}
			if bytes[currentIndex] >= 0xFE {
				valueBytesLength = currentIndex - lastIndex - 1
				break
			}
		}
		if valueBytesLength == 1 && bytes[lastIndex + 1] == 0xFD {
			currentLine.append(nil)
		} else if valueBytesLength == 1 && bytes[lastIndex + 1] == 0xFC {
			currentLine.append("")
		} else if valueBytesLength >= 1 {
			let strValue = String(bytes: bytes[lastIndex + 1 ..< lastIndex + 1 + valueBytesLength], encoding: .utf8)
			if strValue == nil {
				fatalError("Invalid string value")
			}
			currentLine.append(strValue)
		} else if !(((currentIndex >= 0 && bytes[currentIndex] == 0xFF) || (currentIndex < 0)) && ((lastIndex < 0) || (lastIndex >= 0 && bytes[lastIndex] == 0xFF))) {
			fatalError("Invalid BSV value byte sequence")
		}
		if currentIndex < 0 {
			break
		} else if currentIndex >= 0 && bytes[currentIndex] == 0xFF {
			result.append(currentLine)
			currentLine = []
		}
	}
	result.append(currentLine)
	return result
}

func saveBsv(_ jaggedArray: [[String?]], _ filePath: String) throws {
	let bytes = encodeBsv(jaggedArray)
	let data = Data(bytes)
	try data.write(to: URL(fileURLWithPath: filePath))
}

func loadBsv(_ filePath: String) throws -> [[String?]] {
	let data = try Data(contentsOf: URL(fileURLWithPath: filePath))
	return decodeBsv([UInt8](data))
}

func jaggedArrayToString(_ jaggedArray: [[String?]]) -> String {
	var sb = ""
	sb.append("[")
	for line in jaggedArray {
		sb.append("\n  [")
		var isFirst = true
		for value in line {
			if !isFirst { sb.append(", ") }
			isFirst = false
			if let strValue = value {
				sb.append("\"\(strValue.replacingOccurrences(of: "\n", with: "\\n").replacingOccurrences(of: "\0", with: "\\0"))\"")
			} else {
				sb.append("null")
			}
		}
		sb.append("]")
	}
	sb.append("\n]")
	return sb
}

let jaggedArray: [[String?]] = [
	["Hello", "🌎", nil, ""],
	["A\0B\nC", "Test 𝄞"]
]

print(jaggedArrayToString(jaggedArray))

let bytes = encodeBsv(jaggedArray)
print(bytes)

try saveBsv(jaggedArray, "Test.bsv")

let loadedJaggedArray = try loadBsv("Test.bsv")
print(jaggedArrayToString(loadedJaggedArray))

try saveBsv(loadedJaggedArray, "TestResaved.bsv")