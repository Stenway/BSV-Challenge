/* (C) Stefan John / Stenway / Stenway.com / 2023 */

import java.util.ArrayList;
import java.util.Objects;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CharsetEncoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

class Bsv {
	static byte[] encodeBsv(String[][] jaggedArray) {
		ArrayList<byte[]> parts = new ArrayList<byte[]>();
		byte[] lineBreakByte = new byte[]{(byte)0xFF};
		byte[] valueSeparatorByte = new byte[]{(byte)0xFE};
		byte[] nullValueByte = new byte[]{(byte)0xFD};
		byte[] emptyStringByte = new byte[]{(byte)0xFC};
		CharsetEncoder encoder = StandardCharsets.UTF_8.newEncoder();
		boolean isFirstLine = true;
		int resultLength = 0;
		for (String[] line : jaggedArray) {
			if (isFirstLine == false) { parts.add(lineBreakByte); resultLength++; }
			isFirstLine = false;
			boolean isFirstValue = true;
			for (String value : line) {
				if (isFirstValue == false) { parts.add(valueSeparatorByte); resultLength++; }
				isFirstValue = false;
				if (value == null) { parts.add(nullValueByte); resultLength++; }
				else if (value.length() == 0) { parts.add(emptyStringByte); resultLength++; }
				else {
					byte[] valueBytes;
					try {
						ByteBuffer byteBuffer = encoder.encode(CharBuffer.wrap(value));
						valueBytes = new byte[byteBuffer.limit()];
						byteBuffer.get(valueBytes);
					} catch (Exception e) { throw new RuntimeException("Invalid string value", e); }
					parts.add(valueBytes); resultLength += valueBytes.length;
				}
			}
		}
		byte[] result = new byte[resultLength];		
		ByteBuffer resultBuffer = ByteBuffer.wrap(result);
		for (byte[] part : parts) { resultBuffer.put(part); }
		return result;
	}
	
	static String[][] decodeBsv(byte[] bytes) {
		CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder();
		decoder.onMalformedInput(CodingErrorAction.REPORT);
		decoder.onUnmappableCharacter(CodingErrorAction.REPORT);
		ByteBuffer byteBuffer = ByteBuffer.wrap(bytes);
		ArrayList<String[]> result = new ArrayList<String[]>();
		ArrayList<String> currentLine = new ArrayList<String>();
		int currentIndex = -1;
		for (;;) {
			int lastIndex = currentIndex;
			for (;;) {
				currentIndex++;
				if (currentIndex >= bytes.length) { currentIndex = -1; break; }
				if ((bytes[currentIndex] & 0xFF) >= 0xFE) { break; }
			}
			ByteBuffer valueBytes = ((ByteBuffer)(byteBuffer.duplicate().position(lastIndex+1).limit(currentIndex < 0 ? bytes.length : currentIndex))).slice();
			if (valueBytes.capacity() == 1 && valueBytes.get(0) == (byte)0xFD) { currentLine.add(null); }
			else if (valueBytes.capacity() == 1 && valueBytes.get(0) == (byte)0xFC) { currentLine.add(""); }
			else if (valueBytes.capacity() >= 1) {
				try { currentLine.add(decoder.decode(valueBytes).toString()); }
				catch (Exception e) { throw new RuntimeException("Invalid string value", e); }
			} else if ((((currentIndex >= 0 && bytes[currentIndex] == 0xFF) || (currentIndex < 0)) && ((lastIndex < 0) || (lastIndex >= 0 && bytes[lastIndex] == 0xFF))) == false) { throw new RuntimeException("Invalid BSV value byte sequence"); }
			if (currentIndex < 0) { break; }
			else if (currentIndex >= 0 && bytes[currentIndex] == (byte)0xFF) {
				result.add(currentLine.toArray(new String[0]));
				currentLine.clear();
			}
		}
		result.add(currentLine.toArray(new String[0]));
		return result.toArray(new String[0][]);
	}
	
	// ----------------------------------------------------------------------
	
	static void saveBsv(String[][] jaggedArray, String filePath) throws IOException {
		Objects.requireNonNull(filePath);
		Files.write(Paths.get(filePath), encodeBsv(jaggedArray));
	}
	
	static String[][] load(String filePath) throws IOException {
		Objects.requireNonNull(filePath);
		return decodeBsv(Files.readAllBytes(Paths.get(filePath)));
	}
	
	static void appendBsv(String[][] jaggedArray, String filePath) throws IOException {
		OutputStream stream;
		boolean existed;
		try {
			stream = Files.newOutputStream(Paths.get(filePath), StandardOpenOption.APPEND);
			existed = true;
		} catch (java.nio.file.NoSuchFileException exception) {
			stream = Files.newOutputStream(Paths.get(filePath), StandardOpenOption.CREATE_NEW);
			existed = false;
		}
		try {
			if (existed == true) { stream.write(0xFF); }
			stream.write(encodeBsv(jaggedArray));
		} finally { stream.close(); }
	}
	
	// ----------------------------------------------------------------------

	static String jaggedArrayToString(String[][] jaggedArray) {
		StringBuilder sb = new StringBuilder();
		sb.append("[");
		for (String[] line : jaggedArray) {
			sb.append("\n  [");
			boolean isFirst = true;
			for (String value : line) {
				if (!isFirst) { sb.append(", "); }
				isFirst = false;
				if (value == null) { sb.append("null"); }
				else { sb.append("\""+value+"\""); }
			}
			sb.append("]");
		}
		sb.append("\n]");
		return sb.toString();
	}
	
	public static void main(String[] args) {
		try {
			String[][] jaggedArray = {{"Hello", "\uD83C\uDF0E", null, ""}, {"Test\uD834\uDD1E"}};
			saveBsv(jaggedArray, "Test.bsv");
			String[][] loadedJaggedArray = load("Test.bsv");
			System.out.println(jaggedArrayToString(loadedJaggedArray));
			
			appendBsv(new String[][]{{"ABC"}}, "Append.bsv");
		} catch(Exception e) {
			System.out.println(e.toString());
		}
		
	}
}