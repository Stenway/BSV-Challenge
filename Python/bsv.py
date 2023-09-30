# (C) Stefan John / Stenway / Stenway.com / 2023

def encode_bsv(jagged_array: list[list[str | None]]) -> bytes:
	parts: list[bytes] = []
	is_first_line = True
	for line in jagged_array:
		if not is_first_line: parts.append(b"\xFF")
		is_first_line = False
		is_first_value = True
		for value in line:
			if not is_first_value: parts.append(b"\xFE")
			is_first_value = False
			if value is None: parts.append(b"\xFD")
			elif len(value) == 0: parts.append(b"\xFC")
			else: parts.append(value.encode())
	return b"".join(parts)

def decode_bsv(bytes: bytes) -> list[list[str | None]]:
	result: list[list[str | None]] = []
	currentLine: list[str | None] = []
	currentIndex = -1
	while True:
		lastIndex = currentIndex
		while True:
			currentIndex += 1
			if currentIndex >= len(bytes):
				currentIndex = -1
				break
			if bytes[currentIndex] >= 0xFE: break
		valueBytes = bytes[lastIndex+1 : len(bytes) if currentIndex < 0 else currentIndex]
		if len(valueBytes) == 1 and valueBytes[0] == 0xFD: currentLine.append(None)
		elif len(valueBytes) == 1 and valueBytes[0] == 0xFC: currentLine.append("")
		elif len(valueBytes) >= 1: currentLine.append(valueBytes.decode())
		elif (((currentIndex >= 0 and bytes[currentIndex] == 0xFF) or (currentIndex < 0)) and ((lastIndex < 0) or (lastIndex >= 0 and bytes[lastIndex] == 0xFF))) == False: raise Exception("Invalid BSV value byte sequence")
		if currentIndex < 0: break
		elif currentIndex >= 0 and bytes[currentIndex] == 0xFF:
			result.append(currentLine)
			currentLine = []
	result.append(currentLine)
	return result

# ----------------------------------------------------------------------

def save_bsv(jagged_array: list[list[str | None]], filePath: str):
	with open(filePath, "wb") as file:
		file.write(encode_bsv(jagged_array))

def load_bsv(filePath: str) -> list[list[str | None]]:
	with open(filePath, "rb") as file:
		return decode_bsv(file.read())

def append_bsv(jagged_array: list[list[str | None]], filePath: str):
	try:
		file = open(filePath, "br+")
		existed = True
	except FileNotFoundError as e:
		file = open(filePath, "bx")
		existed = False
	try:
		if existed:
			file.seek(0, 2)
			file.write(b"\xFF")
		file.write(encode_bsv(jagged_array))
	finally: file.close()

# ----------------------------------------------------------------------

def main():
	print("------------")
	jagged_array = [["Hello", "🌎", None, ""], ["A\0B\nC", "Test 𝄞"]]
	print(jagged_array)
	
	encoded_bytes = encode_bsv(jagged_array)
	print(encoded_bytes)
	decoded = decode_bsv(encoded_bytes)
	print(decoded)
	
	save_bsv(jagged_array, "Test.bsv")
	loaded = load_bsv("Test.bsv")
	print(loaded)
	
	append_bsv([["ABC"]], "Append.bsv")
	
	print("------------")
	
main()