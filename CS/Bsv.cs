#nullable enable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.IO;

static byte[] EncodeBsv(string?[][] jaggedArray) {
	var parts = new List<byte[]>();
	var lineBreakByte = new byte[]{0xFF};
	var valueSeparatorByte = new byte[]{0xFE};
	var nullValueByte = new byte[]{0xFD};
	var emptyStringByte = new byte[]{0xFC};
	var encoder = new UTF8Encoding(false, true);
	var isFirstLine = true;
	foreach (var line in jaggedArray) {
		if (isFirstLine == false) { parts.Add(lineBreakByte); }
		isFirstLine = false;
		var isFirstValue = true;
		foreach (var value in line) {
			if (isFirstValue == false) { parts.Add(valueSeparatorByte); }
			isFirstValue = false;
			if (value == null) { parts.Add(nullValueByte); }
			else if (value.Length == 0) { parts.Add(emptyStringByte); }
			else { parts.Add(encoder.GetBytes(value)); }
		}
	}
	var result = new byte[parts.Sum(part => part.Length)];
	var stream = new MemoryStream(result);
    foreach (var part in parts) { stream.Write(part, 0, part.Length); }
	return result;
}

static string?[][] DecodeBsv(byte[] bytes) {
	var decoder = new UTF8Encoding(false, true);
	var result = new List<string?[]>();
	var currentLine = new List<string?>();
	var currentIndex = -1;
	for (;;) {
		var lastIndex = currentIndex;
		for (;;) {
			currentIndex++;
			if (currentIndex >= bytes.Length) { currentIndex = -1; break; }
			if (bytes[currentIndex] >= 0xFE) { break; }
		}
		var valueBytes = currentIndex < 0 ? bytes.Skip(lastIndex+1).ToArray() : bytes.Skip(lastIndex+1).Take(currentIndex-lastIndex-1).ToArray();
		if (valueBytes.Length == 1 && valueBytes[0] == 0xFD) { currentLine.Add(null); }
		else if (valueBytes.Length == 1 && valueBytes[0] == 0xFC) { currentLine.Add(""); }
		else if (valueBytes.Length >= 1) { currentLine.Add(decoder.GetString(valueBytes)); }
		else if ((((currentIndex >= 0 && bytes[currentIndex] == 0xFF) || (currentIndex < 0)) && ((lastIndex < 0) || (lastIndex >= 0 && bytes[lastIndex] == 0xFF))) == false) { throw new Exception("Invalid BSV value byte sequence"); }
		if (currentIndex < 0) { break; }
		else if (currentIndex >= 0 && bytes[currentIndex] == 0xFF) {
			result.Add(currentLine.ToArray());
			currentLine.Clear();
		}
	}
	result.Add(currentLine.ToArray());
	return result.ToArray();
}

// ----------------------------------------------------------------------

static void SaveBsv(string?[][] jaggedArray, string filePath) {
	File.WriteAllBytes(filePath, EncodeBsv(jaggedArray));
}

static string?[][] LoadBsv(string filePath) {
	return DecodeBsv(File.ReadAllBytes(filePath));
}

static void AppendBsv(string?[][] jaggedArray, string filePath) {
	var openFile = () => {
		try { return (File.Open(filePath, FileMode.Open, FileAccess.Write), true); }
		catch (FileNotFoundException exception) { return (File.Open(filePath, FileMode.CreateNew, FileAccess.Write), false); }
	};
	var (handle, existed) = openFile();
	try {
		handle.Position = handle.Length;
		if (existed == true) { handle.Write(new byte[]{0xFF}); }
		handle.Write(EncodeBsv(jaggedArray));
	} finally { handle.Close(); }
}

// ----------------------------------------------------------------------

static string ByteArrayToString(byte[] bytes) {
	return "["+string.Join(", ", bytes)+"]";
}

static string JaggedArrayToString(string?[][] jaggedArray) {
	return "[\n"+String.Join("\n", jaggedArray.Select((line) => "  ["+String.Join(", ", line.Select(x => x == null ? "null" : "\""+x.Replace("\n", "\\n").Replace("\0", "\\0")+"\""))+"]"))+"\n]";
}

static void PrintJaggedArray(string?[][] jaggedArray) {
	Console.WriteLine(JaggedArrayToString(jaggedArray));
}

string?[][] jaggedArray = new []{
	new []{"Hello", "🌎", null, ""},
	new []{"A\0B\nC", "Test 𝄞"}
};

Console.OutputEncoding = System.Text.Encoding.UTF8;

PrintJaggedArray(jaggedArray);
var bytes = EncodeBsv(jaggedArray);
Console.WriteLine(ByteArrayToString(bytes));

var decoded = DecodeBsv(bytes);
PrintJaggedArray(jaggedArray);

SaveBsv(jaggedArray, "Test.bsv");
var loaded = LoadBsv("Test.bsv");
PrintJaggedArray(jaggedArray);

AppendBsv(new []{new []{"ABC"}}, "Append.bsv");

Console.WriteLine("Dev");
