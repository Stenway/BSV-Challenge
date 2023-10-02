package main

import (
	"bytes"
	"errors"
	"unicode/utf8"
)

func DecodeBsv_Minimal(bsvBytes []byte) ([][]NullableString, error) {
	result := [][]NullableString{}
	bytesOfLines := bytes.Split(bsvBytes, []byte{0xFF})
	for _, lineBytes := range bytesOfLines {
		bytesOfValues := bytes.Split(lineBytes, []byte{0xFE})
		currentLine := []NullableString{}
		for _, valueBytes := range bytesOfValues {
			if len(valueBytes) == 0 {
				return nil, errors.New("Invalid BSV value byte sequence")
			} else if len(valueBytes) == 1 && valueBytes[0] == 0xFD {
				currentLine = append(currentLine, Null())
			} else if len(valueBytes) == 1 && valueBytes[0] == 0xFC {
				currentLine = append(currentLine, Str(""))
			} else if len(valueBytes) >= 1 {
				if !utf8.ValidString(string(valueBytes)) {
					return nil, errors.New("Invalid string value")
				}
				currentLine = append(currentLine, Str(string(valueBytes)))
			}
		}
		result = append(result, currentLine)
	}
	return result, nil
}
