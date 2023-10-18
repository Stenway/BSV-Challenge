/* (C) Stefan John / Stenway / Stenway.com / 2023 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <stdint.h>

// ----------------------------------------------------------------------

typedef struct Bytes {
	uint8_t* buffer;
	size_t length;
} Bytes;

Bytes* createBytes(size_t length) {
	Bytes* result = malloc(sizeof(Bytes));
	if (result == NULL) { return NULL; }
	result->length = length;
	result->buffer = malloc(result->length);
	if (result == NULL) {
		free(result);
		return NULL;
	}
	return result;
}

void deleteBytes(Bytes* bytes) {
	free(bytes->buffer);
	bytes->buffer = NULL;
	bytes->length = 0;
	free(bytes);
}

Bytes* singleByte(uint8_t value) {
	Bytes* result = createBytes(1);
	if (result == NULL) { return NULL; }
	result->buffer[0] = value;
	return result;
}

// ----------------------------------------------------------------------

typedef Bytes String;

String* createString(size_t length) {
	String* result = malloc(sizeof(String));
	if (result == NULL) { return NULL; }
	result->length = length;
	result->buffer = malloc(result->length);
	if (result == NULL) {
		free(result);
		return NULL;
	}
	return result;
}

String* copyString(char* source, size_t length) {
	String* result = malloc(sizeof(String));
	result->length = length;
	result->buffer = malloc(result->length);
	memcpy(result->buffer, source, result->length);
	return result;
}

void deleteString(String* string) {
	deleteBytes((Bytes*)string);
}

#define STRLIT(s) (copyString(s, sizeof(s)-1))

// ----------------------------------------------------------------------

#define DYNAMIC_ARRAY(typeName, itemType, itemsName, deleteItemFunction) \
typedef struct typeName { \
	itemType* itemsName; \
	size_t length; \
	size_t capacity; \
} typeName; \
\
typeName* create##typeName(size_t capacity) { \
	typeName* result = malloc(sizeof(typeName)); \
	if (result == NULL) { return NULL; } \
	result->itemsName = malloc(capacity*sizeof(itemType)); \
	if (result->itemsName == NULL) { \
		free(result); \
		return NULL; \
	} \
	result->length = 0; \
	result->capacity = capacity; \
	return result; \
} \
\
bool appendTo##typeName(typeName* array, itemType item) { \
	if (array->length == array->capacity) { \
		size_t newCapacity = array->capacity * 2; \
		array->itemsName = malloc(array->capacity*sizeof(itemType)); \
		if (array->itemsName == NULL) { return false; } \
		array->capacity = newCapacity; \
	} \
	array->itemsName[array->length] = item; \
	array->length++; \
	return true; \
} \
\
void delete##typeName(typeName* array) { \
	for (size_t i=0; i<array->length; i++) { \
		deleteItemFunction(array->itemsName[i]); \
	} \
	free(array->itemsName); \
	array->itemsName = NULL; \
	array->length = 0; \
	array->capacity = 0; \
	free(array); \
} \
\
void delete##typeName##Shallow(typeName* array) { \
	free(array->itemsName); \
	array->itemsName = NULL; \
	array->length = 0; \
	array->capacity = 0; \
	free(array); \
}

DYNAMIC_ARRAY(BytesList, Bytes*, values, deleteBytes)
DYNAMIC_ARRAY(JaggedArrayLine, String*, values, deleteString)
DYNAMIC_ARRAY(JaggedArray, JaggedArrayLine*, lines, deleteJaggedArrayLine)

// ----------------------------------------------------------------------

static const uint8_t utf8ByteClassLookup[256] = {
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
};

static const uint8_t utf8StateTransitionLookup[108] = {
	0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x1, 0x0, 0x0, 0x0, 0x2, 0x3, 0x5, 0x4, 0x6, 0x7, 0x8,
	0x0, 0x0, 0x1, 0x1, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x0, 0x0, 0x0, 0x2, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x0, 0x2, 0x2, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x0, 0x2, 0x2, 0x2, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x0, 0x0, 0x5, 0x5, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x0, 0x5, 0x5, 0x5, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
	0x0, 0x0, 0x5, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0
};

bool isValidUtf8(String* string) {
	uint8_t lastState = 1;
	for (int i=0; i<string->length; i++) {
		uint8_t currentByte = string->buffer[i];
		uint8_t currentByteClass = utf8ByteClassLookup[currentByte];
		uint8_t newStateLookupIndex = lastState*12+currentByteClass;
		lastState = utf8StateTransitionLookup[newStateLookupIndex];
		if (lastState == 0) { return false; }
	}
	return (lastState == 1);
}

// ----------------------------------------------------------------------

#define DEFAULT_JAGGED_ARRAY_CAPACITY 16
#define DEFAULT_LINE_CAPACITY 4

Bytes* encodeBsv(JaggedArray* jaggedArray) {
	BytesList* parts = createBytesList(128);
	Bytes* lineBreakByte = singleByte(0xFF);
	Bytes* valueSeparatorByte = singleByte(0xFE);
	Bytes* nullValueByte = singleByte(0xFD);
	Bytes* emptyStringByte = singleByte(0xFC);
	bool errorOccurred = false;
	size_t resultLength = 0;
	for (int i=0; i<jaggedArray->length; i++) {
		if (i != 0) {
			if (appendToBytesList(parts, lineBreakByte) == false) {
				errorOccurred = true;
				break;
			}
			resultLength++;
		}
		JaggedArrayLine* line = jaggedArray->lines[i];
		for (int j=0; j<line->length; j++) {
			if (j != 0) {
				if (appendToBytesList(parts, valueSeparatorByte) == false) {
					errorOccurred = true;
					break;
				}
				resultLength++;
			}
			String* value = line->values[j];
			if (value == NULL) {
				if (appendToBytesList(parts, nullValueByte) == false) {
					errorOccurred = true;
					break;
				}
				resultLength++;
			} else if (value->length == 0) {
				if (appendToBytesList(parts, emptyStringByte) == false) {
					errorOccurred = true;
					break;
				}
				resultLength++;
			} else {
				if (isValidUtf8(value) == false || appendToBytesList(parts, value) == false) {
					errorOccurred = true;
					break;
				}
				resultLength += value->length;
			}
		}
		if (errorOccurred) { break; }
	}
	Bytes* result = NULL;
	if (errorOccurred == false) {
		result = createBytes(resultLength);
		if (result != NULL) {
			size_t currentPos = 0;
			for (size_t i=0; i<parts->length; i++) {
				Bytes* part = parts->values[i];
				memcpy(&result->buffer[currentPos], part->buffer, part->length);
				currentPos += part->length;
			}
		};
	}
	deleteBytes(lineBreakByte);
	deleteBytes(valueSeparatorByte);
	deleteBytes(nullValueByte);
	deleteBytes(emptyStringByte);
	deleteBytesListShallow(parts);
	return result;
}

JaggedArray* decodeBsv(Bytes bytes) {
	JaggedArray* result = createJaggedArray(DEFAULT_JAGGED_ARRAY_CAPACITY);
	JaggedArrayLine* currentLine = createJaggedArrayLine(DEFAULT_LINE_CAPACITY);
	long currentIndex = -1;
	bool errorOccurred = false;
	for (;;) {
		long lastIndex = currentIndex;
		long valueBytesLength;
		for (;;) {
			currentIndex++;
			if (currentIndex >= bytes.length) {
				currentIndex = -1;
				valueBytesLength = bytes.length-lastIndex-1;
				break;
			}
			if (bytes.buffer[currentIndex] >= 0xFE) {
				valueBytesLength = currentIndex-lastIndex-1;
				break; 
			}
		}
		if (valueBytesLength == 1 && bytes.buffer[lastIndex+1] == 0xFD) {
			if (appendToJaggedArrayLine(currentLine, NULL) == false) {
				errorOccurred = true;
				break;
			}
		} else if (valueBytesLength == 1 && bytes.buffer[lastIndex+1] == 0xFC) {
			if (appendToJaggedArrayLine(currentLine, STRLIT("")) == false) {
				errorOccurred = true;
				break;
			}
		} else if (valueBytesLength >= 1) {
			String* value = copyString((char*)&bytes.buffer[lastIndex+1], valueBytesLength);
			if (isValidUtf8(value) == false) {
				errorOccurred = true;
				break;
			}
			if (appendToJaggedArrayLine(currentLine, value) == false) {
				errorOccurred = true;
				break;
			}
		} else if ((((currentIndex >= 0 && bytes.buffer[currentIndex] == 0xFF) || (currentIndex < 0)) && ((lastIndex < 0) || (lastIndex >= 0 && bytes.buffer[lastIndex] == 0xFF))) == false) {
			errorOccurred = true;
			break;
		}
		if (currentIndex < 0) { break; }
		else if (currentIndex >= 0 && bytes.buffer[currentIndex] == 0xFF) {
			if (appendToJaggedArray(result, currentLine) == false) {
				errorOccurred = true;
				break;
			}
			currentLine = createJaggedArrayLine(DEFAULT_LINE_CAPACITY);
			if (currentLine == NULL) {
				errorOccurred = true;
				break;
			}
		}
	}
	if (appendToJaggedArray(result, currentLine) == false) { errorOccurred = true; };
	if (errorOccurred) {
		deleteJaggedArray(result);
		return NULL;
	}
	return result;
}

// ----------------------------------------------------------------------

void printString(String* str) {
	printf("\"%.*s\"", str->length, str->buffer);
}

void printJaggedArray(JaggedArray* jaggedArray) {
	printf("[\n");
	for (int i=0; i<jaggedArray->length; i++) {
		printf("  [");
		JaggedArrayLine* line = jaggedArray->lines[i];
		for (int j=0; j<line->length; j++) {
			String* value = line->values[j];
			if (j != 0) { printf(", "); }
			if (value == NULL) { printf("null"); }
			else { printString(value); }
		}
		printf("]\n");
	}
	printf("]\n");
}

// ----------------------------------------------------------------------

long getFileSize(FILE* file) {
	if (fseek(file, 0, SEEK_END) == -1) { return -1; }
	long size = ftell(file);
	rewind(file);
	return size;
}

bool saveFile(Bytes* bytes, char* filePath) {
	FILE* file = fopen(filePath, "wb");
	if (file == NULL) { return false; }
	if (fwrite(bytes->buffer, bytes->length, 1, file) != 1) {
		fclose(file);
		return false;
	}
	return fclose(file) != 0;
}

bool loadFile(char* filePath, Bytes* output) {
	FILE* file = fopen(filePath, "rb");
	if (file == NULL) { return false; }
	long size = getFileSize(file);
	if (size < 0) {
		fclose(file);
		return false;
	}
	unsigned char* bytes = (unsigned char*)malloc(size * sizeof(unsigned char));
	if (bytes == NULL) { return false; }
	if (fread(bytes, size, 1, file) != 1) {
		free(bytes);
		fclose(file);
		return false;
	}
	if (fclose(file) != 0) {
		free(bytes);
		return false;
	}
	output->buffer = bytes;
	output->length = size;
	return true;
}

// ----------------------------------------------------------------------

bool saveBsv(JaggedArray* jaggedArray, char* filePath) {
	Bytes* bytes = encodeBsv(jaggedArray);
	if (bytes == NULL) { return false; }
	bool result = saveFile(bytes, filePath);
	deleteBytes(bytes);
	return result;
}

JaggedArray* loadBsv(char* filePath) {
	Bytes bytes;
	if (loadFile(filePath, &bytes) != true) { return NULL; }
	JaggedArray* result = decodeBsv(bytes);
	free(bytes.buffer);
	return result;
}

// ----------------------------------------------------------------------

int main() {
	JaggedArray* jaggedArray = createJaggedArray(2);
	JaggedArrayLine* line1 = createJaggedArrayLine(4);
	appendToJaggedArrayLine(line1, STRLIT("Hello"));
	appendToJaggedArrayLine(line1, STRLIT("🌎"));
	appendToJaggedArrayLine(line1, NULL);
	appendToJaggedArrayLine(line1, STRLIT(""));
	appendToJaggedArray(jaggedArray, line1);
	JaggedArrayLine* line2 = createJaggedArrayLine(2);
	appendToJaggedArrayLine(line2, STRLIT("A\0B\nC"));
	appendToJaggedArrayLine(line2, STRLIT("Test 𝄞"));
	appendToJaggedArray(jaggedArray, line2);
	
	if (saveBsv(jaggedArray, "Test.bsv") == false ) { return -1; }
	
	JaggedArray* loadedJaggedArray = loadBsv("Test.bsv");
	if (loadedJaggedArray == NULL) { return -1; }
	printJaggedArray(loadedJaggedArray);

	if (saveBsv(loadedJaggedArray, "TestResaved.bsv") == false ) { return -1; }
	
	printf("\nEnd");
	return 0;
}