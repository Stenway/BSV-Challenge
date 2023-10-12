/* (C) Stefan John / Stenway / Stenway.com / 2023 */

package main

import "core:fmt"
import "core:bytes"
import "core:strings"
import "core:unicode/utf8"
import "core:os"

BsvError :: enum {
	None,
	InvalidString,
	InvalidBsvByteSequence
}

encode_bsv :: proc(jagged_array: [dynamic][dynamic]Maybe(string)) -> ([]u8, BsvError) {
	parts := [dynamic]string{}
	is_first_line := true
	for line in jagged_array {
		if !is_first_line { append(&parts, "\xFF") }
		is_first_line = false
		is_first_value := true
		for value in line {
			if !is_first_value { append(&parts, "\xFE") }
			is_first_value = false
			if value == nil { append(&parts, "\xFD") }
			else if len(value.?) == 0 { append(&parts, "\xFC") }
			else {
				if !utf8.valid_string(value.?) { return []u8{}, .InvalidString }
				append(&parts, value.?)
			}
		}
	}
	return transmute([]u8)strings.join(parts[:], ""), .None
}

decode_bsv :: proc(bytes: []u8) -> ([dynamic][dynamic]Maybe(string), BsvError) {
	result := [dynamic][dynamic]Maybe(string){}
	current_line := [dynamic]Maybe(string){}
	current_index := -1
	for true {
		last_index := current_index
		value_end_index := 0
		for true {
			current_index += 1
			if current_index >= len(bytes) {
				current_index = -1
				value_end_index = len(bytes)
				break
			}
			if bytes[current_index] >= 0xFE {
				value_end_index = current_index
				break
			}
		}
		value_bytes := bytes[last_index+1 : value_end_index]
		if len(value_bytes) == 1 && value_bytes[0] == 0xFD {
			append(&current_line, nil)
		} else if len(value_bytes) == 1 && value_bytes[0] == 0xFC {
			append(&current_line, "")
		} else if len(value_bytes) >= 1 {
			str := string(value_bytes)
			if !utf8.valid_string(str) { return [dynamic][dynamic]Maybe(string){}, .InvalidString }
			append(&current_line, strings.clone(string(str)))
		} else if (((current_index >= 0 && bytes[current_index] == 0xFF) || (current_index < 0)) && ((last_index < 0) || (last_index >= 0 && bytes[last_index] == 0xFF))) == false {
			return [dynamic][dynamic]Maybe(string){}, .InvalidBsvByteSequence
		}
		if current_index < 0 {
			break
		} else if current_index >= 0 && bytes[current_index] == 0xFF {
			append(&result, current_line)
			current_line = [dynamic]Maybe(string){}
		}
	}
	append(&result, current_line)
	return result, .None
}

// ----------------------------------------------------------------------

save_bsv :: proc(jagged_array: [dynamic][dynamic]Maybe(string), file_path: string) -> bool {
	bytes, error := encode_bsv(jagged_array)
	defer delete(bytes, context.allocator)
	if error != nil { return false }
	success := os.write_entire_file(file_path, bytes)
	return success
}

load_bsv :: proc(file_path: string) -> ([dynamic][dynamic]Maybe(string), bool) {
	bytes, success := os.read_entire_file_from_filename(file_path)
	defer delete(bytes, context.allocator)
	if !success {
		return [dynamic][dynamic]Maybe(string){}, false
	}
	jagged_array, error := decode_bsv(bytes)
	if error != nil { return [dynamic][dynamic]Maybe(string){}, false }
	return jagged_array, true
}

// ----------------------------------------------------------------------

main :: proc() {
	jagged_array := [dynamic][dynamic]Maybe(string){
		[dynamic]Maybe(string){"Hello", "🌎", nil, ""},
		[dynamic]Maybe(string){"A\x00B\nC", "Test 𝄞"}
	}
	fmt.println(jagged_array)
	
	bytes, _ := encode_bsv(jagged_array)
	fmt.println(bytes)
	
	decoded_jagged_array, _ := decode_bsv(bytes)
	fmt.println(decoded_jagged_array)
	
	save_bsv(jagged_array, "Test.bsv")
	loaded_jagged_array, _ := load_bsv("Test.bsv")
	fmt.println(loaded_jagged_array)
}