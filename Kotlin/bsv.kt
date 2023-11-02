/* (C) Stefan John / Stenway / Stenway.com / 2023 */

import java.io.IOException
import java.io.OutputStream
import java.nio.ByteBuffer
import java.nio.CharBuffer
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.NoSuchFileException
import java.nio.file.Paths
import java.nio.file.StandardOpenOption
import java.util.*

fun encodeBsv(jaggedArray: Array<Array<String?>>): ByteArray {
	val parts = ArrayList<ByteArray>()
	val lineBreakByte = byteArrayOf(0xFF.toByte())
	val valueSeparatorByte = byteArrayOf(0xFE.toByte())
	val nullValueByte = byteArrayOf(0xFD.toByte())
	val emptyStringByte = byteArrayOf(0xFC.toByte())
	val encoder = StandardCharsets.UTF_8.newEncoder()
	var isFirstLine = true
	var resultLength = 0
	for (line in jaggedArray) {
		if (isFirstLine == false) {
			parts.add(lineBreakByte)
			resultLength++
		}
		isFirstLine = false
		var isFirstValue = true
		for (value in line) {
			if (isFirstValue == false) {
				parts.add(valueSeparatorByte)
				resultLength++
			}
			isFirstValue = false
			if (value == null) {
				parts.add(nullValueByte)
				resultLength++
			} else if (value.length == 0) {
				parts.add(emptyStringByte)
				resultLength++
			} else {
				var valueBytes: ByteArray
				try {
					val byteBuffer = encoder.encode(CharBuffer.wrap(value))
					valueBytes = ByteArray(byteBuffer.limit())
					byteBuffer[valueBytes]
				} catch (e: Exception) {
					throw RuntimeException("Invalid string value", e)
				}
				parts.add(valueBytes)
				resultLength += valueBytes.size
			}
		}
	}
	val result = ByteArray(resultLength)
	val resultBuffer = ByteBuffer.wrap(result)
	for (part in parts) {
		resultBuffer.put(part)
	}
	return result
}

fun decodeBsv(bytes: ByteArray): Array<Array<String?>> {
	val decoder = StandardCharsets.UTF_8.newDecoder()
	decoder.onMalformedInput(CodingErrorAction.REPORT)
	decoder.onUnmappableCharacter(CodingErrorAction.REPORT)
	val byteBuffer = ByteBuffer.wrap(bytes)
	val result = ArrayList<Array<String?>>()
	val currentLine = ArrayList<String?>()
	var currentIndex = -1
	while (true) {
		val lastIndex = currentIndex
		while (true) {
			currentIndex++
			if (currentIndex >= bytes.size) {
				currentIndex = -1
				break
			}
			if (bytes[currentIndex].toUByte() >= 0xFE.toUByte()) {
				break
			}
		}
		val valueBytes = (byteBuffer.duplicate().position(lastIndex + 1).limit(if (currentIndex < 0) bytes.size else currentIndex) as ByteBuffer).slice()
		if (valueBytes.capacity() == 1 && valueBytes[0] == 0xFD.toByte()) {
			currentLine.add(null)
		} else if (valueBytes.capacity() == 1 && valueBytes[0] == 0xFC.toByte()) {
			currentLine.add("")
		} else if (valueBytes.capacity() >= 1) {
			try {
				currentLine.add(decoder.decode(valueBytes).toString())
			} catch (e: Exception) {
				throw RuntimeException("Invalid string value", e)
			}
		} else if (((currentIndex >= 0 && bytes[currentIndex] == 0xFF.toByte() || currentIndex < 0) && (lastIndex < 0 || lastIndex >= 0 && bytes[lastIndex] == 0xFF.toByte())) == false) {
			throw RuntimeException("Invalid BSV value byte sequence")
		}
		if (currentIndex < 0) {
			break
		} else if (currentIndex >= 0 && bytes[currentIndex] == 0xFF.toByte()) {
			result.add(currentLine.toTypedArray())
			currentLine.clear()
		}
	}
	result.add(currentLine.toTypedArray())
	return result.toTypedArray()
}
	
// ----------------------------------------------------------------------

@Throws(IOException::class)
fun saveBsv(jaggedArray: Array<Array<String?>>, filePath: String) {
	Objects.requireNonNull(filePath)
	Files.write(Paths.get(filePath), encodeBsv(jaggedArray))
}

@Throws(IOException::class)
fun loadBsv(filePath: String): Array<Array<String?>> {
	Objects.requireNonNull(filePath)
	return decodeBsv(Files.readAllBytes(Paths.get(filePath)))
}

@Throws(IOException::class)
fun appendBsv(jaggedArray: Array<Array<String?>>, filePath: String?) {
	var stream: OutputStream
	var existed: Boolean
	try {
		stream = Files.newOutputStream(Paths.get(filePath), StandardOpenOption.APPEND)
		existed = true
	} catch (exception: NoSuchFileException) {
		stream = Files.newOutputStream(Paths.get(filePath), StandardOpenOption.CREATE_NEW)
		existed = false
	}
	try {
		if (existed == true) {
			stream.write(0xFF)
		}
		stream.write(encodeBsv(jaggedArray))
	} finally {
		stream.close()
	}
}

// ----------------------------------------------------------------------

fun jaggedArrayToString(jaggedArray: Array<Array<String?>>): String {
	val sb = StringBuilder()
	sb.append("[")
	for (line in jaggedArray) {
		sb.append("\n  [")
		var isFirst = true
		for (value in line) {
			if (!isFirst) {
				sb.append(", ")
			}
			isFirst = false
			if (value == null) {
				sb.append("null")
			} else {
				sb.append("\"" + value.replace("\n", "\\n").replace("\u0000", "\\0") + "\"")
			}
		}
		sb.append("]")
	}
	sb.append("\n]")
	return sb.toString()
}
	
fun main(args: Array<String>) {
	try {
		val jaggedArray = arrayOf(arrayOf("Hello", "🌎", null, ""), arrayOf<String?>("A\u0000B\nC", "Test 𝄞"))
		println(jaggedArrayToString(jaggedArray))
		
		val bytes = encodeBsv(jaggedArray)
		val decodedJaggedArray = decodeBsv(bytes)
		println(jaggedArrayToString(decodedJaggedArray))
		
		saveBsv(jaggedArray, "Test.bsv")
		val loadedJaggedArray = loadBsv("Test.bsv")
		println(jaggedArrayToString(loadedJaggedArray))
		
		saveBsv(loadedJaggedArray, "TestResaved.bsv")
		
		appendBsv(arrayOf(arrayOf<String?>("ABC")), "Append.bsv")
	} catch (e: Exception) {
		println(e.toString())
	}
}