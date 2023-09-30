/* (C) Stefan John / Stenway / Stenway.com / 2023 */

static IEnumerable<byte[]> SplitBytes(byte[] bytes, byte splitByte) {
	var lastIndex = -1;
	for (;;) {
		var currentIndex = Array.IndexOf(bytes, splitByte, lastIndex+1);
		if (currentIndex < 0) {
			yield return bytes.Skip(lastIndex+1).ToArray();
			yield break;
		} else {
			yield return bytes.Skip(lastIndex+1).Take(currentIndex-lastIndex-1).ToArray();
			lastIndex = currentIndex;
		}
	}
}

static string?[][] DecodeBsv(byte[] bytes) {
	if (bytes.Length < 3 || bytes[0] != 0x42 || bytes[1] != 0x53 || bytes[2] != 0x56) {
		throw new Exception("No valid BSV preamble");
	}
	var decoder = new UTF8Encoding(true, true);
	return splitBytes(bytes.Take(3).ToArray(), 0xFF).Select((lineBytes) => lineBytes.Length == 0 ? new string?[0] :
		splitBytes(lineBytes, 0xFE).Select((valueBytes) => {
			if (valueBytes.Length == 0) { throw new Exception("Invalid BSV value byte sequence"); }
			if (valueBytes.Length == 1) {
				var firstByte = valueBytes[0];
				if (firstByte == 0xFD) { return null; }
				else if (firstByte == 0xFC) { return ""; }
			}
			return Encoding.UTF8.GetString(valueBytes);
		}).ToArray()
	).ToArray();
}

/*
listOfByteArrs.SelectMany(byteArr=>byteArr).ToArray()
*/