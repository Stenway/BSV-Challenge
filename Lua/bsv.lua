﻿-- (C) Stefan John / Stenway / Stenway.com / 2023

utf8ByteClassLookup = {
	0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1,
	0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1,
	0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1,
	0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1,
	0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1,
	0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1,
	0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1,
	0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1, 0x1,
	0x2, 0x2, 0x2, 0x2, 0x2, 0x2, 0x2, 0x2, 0x2, 0x2, 0x2, 0x2, 0x2, 0x2, 0x2, 0x2,
	0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3, 0x3,
	0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4,
	0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x4,
	0x0, 0x0, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5,
	0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5, 0x5,
	0x6, 0x7, 0x7, 0x7, 0x7, 0x7, 0x7, 0x7, 0x7, 0x7, 0x7, 0x7, 0x7, 0x8, 0x7, 0x7,
	0x9, 0xA, 0xA, 0xA, 0xB, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0
}

utf8StateTransitionLookup = {
	0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x1, 0x0, 0x0, 0x0, 0x2, 0x3, 0x5, 0x4, 0x6, 0x7, 0x8,
	0x0, 0x0, 0x1, 0x1, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x0, 0x0, 0x0, 0x2, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x0, 0x2, 0x2, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x0, 0x2, 0x2, 0x2, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x0, 0x0, 0x5, 0x5, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x0, 0x5, 0x5, 0x5, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x0, 0x5, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0
}

function isValidUtf8(str)
	local lastState = 1
	for i = 1, #str do
		local currentByte = string.byte(str, i)
		local currentByteClass = utf8ByteClassLookup[currentByte + 1]
		local newStateLookupIndex = lastState * 12 + currentByteClass
		lastState = utf8StateTransitionLookup[newStateLookupIndex + 1]
		if lastState == 0 then
			return false
		end
	end
	return lastState == 1
end

-- ----------------------------------------------------------------------

function encodeBsv(jaggedArray)
	local result = ""
	local isFirstLine = true
	for _, line in ipairs(jaggedArray) do
		if not isFirstLine then
			result = result .. "\xFF"
		end
		isFirstLine = false
		local isFirstValue = true
		for _, value in ipairs(line) do
			if not isFirstValue then
				result = result .. "\xFE"
			end
			isFirstValue = false
			if type(value) == "table" then
				assert(#value == 0)
				result = result .. "\xFD"
			elseif value == "" then
				result = result .. "\xFC"
			else
				if not isValidUtf8(value) then
					error("Invalid string value")
				end
				result = result .. value
			end
		end
	end
	return result
end

function decodeBsv(bytes)
	local result = {}
	local currentLine = {}
	local currentIndex = -1
	while true do
		local lastIndex = currentIndex
		local valueBytesLength
		while true do
			currentIndex = currentIndex + 1
			if currentIndex >= #bytes then
				currentIndex = -1
				valueBytesLength = #bytes - lastIndex - 1
				break
			end
			if string.byte(bytes, currentIndex+1) >= 0xFE then
				valueBytesLength = currentIndex - lastIndex - 1
				break
			end
		end
		if valueBytesLength == 1 and string.byte(bytes, lastIndex + 2) == 0xFD then
			table.insert(currentLine, {})
		elseif valueBytesLength == 1 and string.byte(bytes, lastIndex + 2) == 0xFC then
			table.insert(currentLine, "")
		elseif valueBytesLength >= 1 then
			local strValue = string.sub(bytes, lastIndex + 2, lastIndex + 2 + valueBytesLength - 1)
			if not isValidUtf8(strValue) then
				error("Invalid string value")
			end
			table.insert(currentLine, strValue)
		elseif ((currentIndex >= 0 and string.byte(bytes, currentIndex+1) == 0xFF) or (currentIndex == 0 and string.byte(bytes, lastIndex+1) == 0xFF)) == false then
			error("Invalid BSV value byte sequence")
		end
		if currentIndex < 0 then
			break
		elseif currentIndex >= 0 and string.byte(bytes, currentIndex+1) == 0xFF then
			table.insert(result, currentLine)
			currentLine = {}
		end
	end
	table.insert(result, currentLine)
	return result
end

-- ----------------------------------------------------------------------

function saveBsv(jaggedArray, filePath)
	local bytes = encodeBsv(jaggedArray)
	local file = assert(io.open(filePath, "wb"))
	file:write(bytes)
	assert(file:close())
end

function loadBsv(filePath)
	local file = assert(io.open(filePath, "rb"))
	local bytes = file:read("*all")
	assert(file:close())
	return decodeBsv(bytes)
end

-- ----------------------------------------------------------------------

function jaggedArrayToString(jaggedArray)
	local result = "["
	for _, line in ipairs(jaggedArray) do
		result = result .. "\n  ["
		local isFirst = true
		for _, value in ipairs(line) do
			if not isFirst then
				result = result .. ", "
			end
			isFirst = false
			if type(value) == "table" then
				assert(#value == 0)
				result = result .. "null"
			else
				result = result .. string.format("\"%s\"", string.gsub(string.gsub(value, "\n", "\\n"), "\0", "\\0"))
			end
		end
		result = result .. "]"
	end
	result = result .. "\n]"
	return result
end

-- ----------------------------------------------------------------------

jaggedArray = {
	{"Hello", "🌎", {}, ""},
	{"A\0B\nC", "Test 𝄞"}
}
print(jaggedArrayToString(jaggedArray))
saveBsv(jaggedArray, "Test.bsv")

loadedJaggedArray = loadBsv("Test.bsv")
print(jaggedArrayToString(loadedJaggedArray))

saveBsv(loadedJaggedArray, "TestResaved.bsv")

