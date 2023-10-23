/* (C) Stefan John / Stenway / Stenway.com / 2023 */

namespace Bsv

import System
import System.Collections.Generic
import System.Linq.Enumerable
import System.Text
import System.IO

[module]
class Bsv:

	static def EncodeBsv(jaggedArray as ((string))) as (byte):
		parts as List[of (byte)] = List[of (byte)]()
		lineBreakByte as (byte) = (of byte: 255)
		valueSeparatorByte as (byte) = (of byte: 254)
		nullValueByte as (byte) = (of byte: 253)
		emptyStringByte as (byte) = (of byte: 252)
		encoder as UTF8Encoding = UTF8Encoding(false, true)
		isFirstLine as bool = true
		for line as (string) in jaggedArray:
			if isFirstLine == false:
				parts.Add(lineBreakByte)
			isFirstLine = false
			isFirstValue as bool = true
			for value as string in line:
				if isFirstValue == false:
					parts.Add(valueSeparatorByte)
				isFirstValue = false
				if value is null:
					parts.Add(nullValueByte)
				elif value.Length == 0:
					parts.Add(emptyStringByte)
				else:
					parts.Add(encoder.GetBytes(value))
		resultLength = 0
		for part as (byte) in parts:
			resultLength += part.Length
		result as (byte) = array(byte, resultLength)
		currentPosition = 0
		for part as (byte) in parts:
			part.CopyTo(result, currentPosition)
			currentPosition += part.Length
		return result

	static def DecodeBsv(bytes as (byte)) as ((string)):
		decoder as UTF8Encoding = UTF8Encoding(false, true)
		result as List[of (string)] = List[of (string)]()
		currentLine as List[of string] = List[of string]()
		currentIndex as int = (-1)
		while true:
			lastIndex as int = currentIndex
			while true:
				currentIndex += 1
				if currentIndex >= bytes.Length:
					currentIndex = (-1)
					break 
				if bytes[currentIndex] >= 254:
					break 
			valueBytes as (byte) = (bytes.Skip((lastIndex + 1)).ToArray() if (currentIndex < 0) else bytes.Skip((lastIndex + 1)).Take(((currentIndex - lastIndex) - 1)).ToArray())
			if (valueBytes.Length == 1) and (valueBytes[0] == 253):
				currentLine.Add(null)
			elif (valueBytes.Length == 1) and (valueBytes[0] == 252):
				currentLine.Add('')
			elif valueBytes.Length >= 1:
				currentLine.Add(decoder.GetString(valueBytes))
			elif ((((currentIndex >= 0) and (bytes[currentIndex] == 255)) or (currentIndex < 0)) and ((lastIndex < 0) or ((lastIndex >= 0) and (bytes[lastIndex] == 255)))) == false:
				raise Exception('Invalid BSV value byte sequence')
			if currentIndex < 0:
				break 
			elif (currentIndex >= 0) and (bytes[currentIndex] == 255):
				result.Add(currentLine.ToArray())
				currentLine.Clear()
		result.Add(currentLine.ToArray())
		return result.ToArray()

	// ----------------------------------------------------------------------

	static def SaveBsv(jaggedArray as ((string)), filePath as string):
		File.WriteAllBytes(filePath, EncodeBsv(jaggedArray))

	static def LoadBsv(filePath as string) as ((string)):
		return DecodeBsv(File.ReadAllBytes(filePath))

	static def AppendBsv(jaggedArray as ((string)), filePath as string):
		handle as FileStream
		existed as bool
		try:
			handle = File.Open(filePath, FileMode.Open, FileAccess.Write)
			existed = true
		except exception as FileNotFoundException:
			handle = File.Open(filePath, FileMode.CreateNew, FileAccess.Write)
			existed = false
		try:
			handle.Position = handle.Length
			if existed == true:
				handle.Write((of byte: 255), 0, 1)
			bytes as (byte) = EncodeBsv(jaggedArray)
			handle.Write(bytes, 0, bytes.Length)
		ensure:
			handle.Close()
	
	// ----------------------------------------------------------------------

	static def JaggedArrayToString(jaggedArray as ((string))) as string:
		return (('[\n' + String.Join('\n', jaggedArray.Select({ line | return (('  [' + String.Join(', ', line.Select({ x | return ('null' if (x is null) else (('"' + x.Replace('\n', '\\n').Replace('\0', '\\0')) + '"')) }))) + ']') }))) + '\n]')

	static def PrintJaggedArray(jaggedArray as ((string))):
		Console.WriteLine(JaggedArrayToString(jaggedArray))

	// ----------------------------------------------------------------------

	static def Main():
		jaggedArray as ((string)) = (('Hello', '🌎', null, ''), ('A\0B\nC', 'Test 𝄞'))
		Console.OutputEncoding = System.Text.Encoding.UTF8
		PrintJaggedArray(jaggedArray)
		bytes as (byte) = EncodeBsv(jaggedArray)
		decodedJaggedArray as ((string)) = DecodeBsv(bytes)
		PrintJaggedArray(decodedJaggedArray)
		
		SaveBsv(jaggedArray, 'Test.bsv')
		loadedJaggedArray as ((string)) = LoadBsv('Test.bsv')
		PrintJaggedArray(loadedJaggedArray)
		SaveBsv(loadedJaggedArray, 'TestResaved.bsv')
		
		AppendBsv((('ABC',),), 'Append.bsv')
		PrintJaggedArray(LoadBsv('Append.bsv'))
		
		Console.WriteLine('Dev')
		Console.ReadKey(true)

Bsv.Main()