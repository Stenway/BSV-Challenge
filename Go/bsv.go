/* (C) Stefan John / Stenway / Stenway.com / 2023 */

package main

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"strings"
	"unicode/utf8"
)

type NullableString struct {
	Value  string
	IsNull bool
}

func Str(str string) NullableString { return NullableString{Value: str, IsNull: false} }
func Null() NullableString          { return NullableString{IsNull: true} }

// ----------------------------------------------------------------------

func EncodeBsv(jaggedArray [][]NullableString) ([]byte, error) {
	parts := [][]byte{}
	lineBreakByte := []byte{0xFF}
	valueSeparatorByte := []byte{0xFE}
	nullValueByte := []byte{0xFD}
	emptyStringByte := []byte{0xFC}
	isFirstLine := true
	for _, line := range jaggedArray {
		if !isFirstLine {
			parts = append(parts, lineBreakByte)
		}
		isFirstLine = false
		isFirstValue := true
		for _, value := range line {
			if !isFirstValue {
				parts = append(parts, valueSeparatorByte)
			}
			isFirstValue = false
			if value.IsNull {
				parts = append(parts, nullValueByte)
			} else if len(value.Value) == 0 {
				parts = append(parts, emptyStringByte)
			} else {
				if !utf8.ValidString(value.Value) {
					return nil, errors.New("Invalid string value")
				}
				parts = append(parts, []byte(value.Value))
			}
		}
	}
	return bytes.Join(parts, nil), nil
}

func DecodeBsv(bytes []byte) ([][]NullableString, error) {
	result := [][]NullableString{}
	currentLine := []NullableString{}
	currentIndex := -1
	for true {
		lastIndex := currentIndex
		var valueEndIndex int
		for true {
			currentIndex++
			if currentIndex >= len(bytes) {
				currentIndex = -1
				valueEndIndex = len(bytes)
				break
			}
			if bytes[currentIndex] >= 0xFE {
				valueEndIndex = currentIndex
				break
			}
		}
		valueBytes := bytes[lastIndex+1 : valueEndIndex]
		if len(valueBytes) == 1 && valueBytes[0] == 0xFD {
			currentLine = append(currentLine, Null())
		} else if len(valueBytes) == 1 && valueBytes[0] == 0xFC {
			currentLine = append(currentLine, Str(""))
		} else if len(valueBytes) >= 1 {
			if !utf8.ValidString(string(valueBytes)) {
				return nil, errors.New("Invalid string value")
			}
			currentLine = append(currentLine, Str(string(valueBytes)))
		} else if (((currentIndex >= 0 && bytes[currentIndex] == 0xFF) || (currentIndex < 0)) && ((lastIndex < 0) || (lastIndex >= 0 && bytes[lastIndex] == 0xFF))) == false {
			return nil, errors.New("Invalid BSV value byte sequence")
		}
		if currentIndex < 0 {
			break
		} else if currentIndex >= 0 && bytes[currentIndex] == 0xFF {
			result = append(result, currentLine)
			currentLine = []NullableString{}
		}
	}
	result = append(result, currentLine)
	return result, nil
}

// ----------------------------------------------------------------------

func SaveBsv(jaggedArray [][]NullableString, filePath string, permissions os.FileMode) error {
	bytes, err := EncodeBsv(jaggedArray)
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, bytes, permissions)
}

func LoadBsv(filePath string) ([][]NullableString, error) {
	bytes, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	return DecodeBsv(bytes)
}

func AppendBsv(jaggedArray [][]NullableString, filePath string, permissions os.FileMode) error {
	existed := true
	file, err := os.OpenFile(filePath, os.O_WRONLY|os.O_APPEND, permissions)
	if err != nil {
		if os.IsNotExist(err) {
			existed = false
			file, err = os.OpenFile(filePath, os.O_CREATE|os.O_EXCL, permissions)
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}
	defer file.Close()
	if existed {
		_, err = file.Write([]byte{0xFF})
		if err != nil {
			return err
		}
	}
	bytes, err := EncodeBsv(jaggedArray)
	if err != nil {
		return err
	}
	_, err = file.Write(bytes)
	if err != nil {
		return err
	}
	return nil
}

// ----------------------------------------------------------------------

func JaggedArrayToString(jaggedArray [][]NullableString) string {
	var builder strings.Builder
	builder.WriteString("[")
	for _, line := range jaggedArray {
		builder.WriteString("\n  [")
		isFirst := true
		for _, value := range line {
			if !isFirst {
				builder.WriteString(", ")
			}
			isFirst = false
			if value.IsNull {
				builder.WriteString("null")
			} else {
				builder.WriteString(fmt.Sprintf("%q", value.Value))
			}
		}
		builder.WriteString("]")
	}
	builder.WriteString("\n]")
	return builder.String()
}

func PrintJaggedArray(jaggedArray [][]NullableString) {
	fmt.Println(JaggedArrayToString(jaggedArray))
}

// ----------------------------------------------------------------------

func main() {
	jaggedArray := [][]NullableString{
		{Str("Hello"), Str("🌎"), Null(), Str("")},
		{Str("A\x00B\nC"), Str("Test 𝄞")},
	}
	PrintJaggedArray(jaggedArray)
	bytes, err := EncodeBsv(jaggedArray)
	if err != nil {
		panic(err)
	}
	fmt.Printf("% X\n", string(bytes))

	decodedJaggedArray, err := DecodeBsv(bytes)
	if err != nil {
		panic(err)
	}
	PrintJaggedArray(decodedJaggedArray)

	err = SaveBsv(jaggedArray, "Test.bsv", 0644)
	if err != nil {
		panic(err)
	}
	loadedJaggedArray, err := LoadBsv("Test.bsv")
	if err != nil {
		panic(err)
	}
	PrintJaggedArray(loadedJaggedArray)

	err = AppendBsv([][]NullableString{{Str("ABC")}}, "Append.bsv", 0644)
	if err != nil {
		panic(err)
	}
}
