/* (C) Stefan John / Stenway / Stenway.com / 2023 */

module main

import os
import strings
import encoding.utf8

// ----------------------------------------------------------------------

fn encode_bsv(jagged_array [][]?string) ![]u8 {
	mut result := []u8{}
	mut is_first_line := true
	for line in jagged_array {
		if !is_first_line { result << 0xFF }
		is_first_line = false
		mut is_first_value := true
		for value in line {
			if !is_first_value { result << 0xFE }
			is_first_value = false
			if str_value := value {
				if str_value.len == 0 { result << 0xFC }
				else {
					if !utf8.validate_str(str_value) { return error('Invalid string value') }
					result << str_value.bytes()
				}
			} else {
				result << 0xFD
			}
		}
	}
	return result
}

fn decode_bsv(bytes []u8) ![][]?string {
	mut result := [][]?string{}
	mut current_line := []?string{}
	mut current_index := -1
	for true {
		last_index := current_index
		for true {
			current_index++
			if current_index >= bytes.len {
				current_index = -1
				break
			}
			if bytes[current_index] >= 0xFE { break }
		}
		value_bytes := bytes[(last_index+1)..(if current_index < 0 { bytes.len } else { current_index })]
		if value_bytes.len == 1 && value_bytes[0] == 0xFD { current_line << none }
		else if value_bytes.len == 1 && value_bytes[0] == 0xFC { current_line << '' }
		else if value_bytes.len >= 1 {
			str_value := value_bytes.bytestr()
			if !utf8.validate_str(str_value) { return error('Invalid string value') }
			current_line << str_value
		} else if (((current_index >= 0 && bytes[current_index] == 0xFF) || (current_index < 0)) && ((last_index < 0) || (last_index >= 0 && bytes[last_index] == 0xFF))) == false { return error('Invalid BSV value byte sequence') }
		if current_index < 0 {
			break
		} else if current_index >= 0 && bytes[current_index] == 0xFF {
			result << current_line
			current_line = []?string{}
		}
	}
	result << current_line
	return result
}

// ----------------------------------------------------------------------

fn save_bsv(jagged_array [][]?string, file_path string) ! {
	bytes := encode_bsv(jagged_array)!
	return os.write_file_array(file_path, bytes)
}

fn load_bsv(file_path string) ![][]?string {
	bytes := os.read_bytes(file_path)!
	return decode_bsv(bytes)
}

// ----------------------------------------------------------------------

fn jagged_array_to_string(jagged_array [][]?string) string {
	mut builder := strings.new_builder(1)
	builder.write_string('[')
	for line in jagged_array {
		builder.write_string('\n  [')
		mut is_first := true
		for value in line {
			if !is_first { builder.write_string(', ') }
			is_first = false
			if str_value := value {
				builder.write_string('"')
				builder.write_string(str_value.replace('\0', '\\0').replace('\n', '\\n'))
				builder.write_string('"')
			} else {
				builder.write_string('null')
			}
			
		}
		builder.write_string(']')
	}
	builder.write_string('\n]')
	return builder.str()
}

fn main() {
	mut jagged_array := [][]?string{}
	mut line1 := []?string{}
	line1 << 'Hello'
	line1 << '🌎'
	line1 << none
	line1 << ''
	jagged_array << line1
    mut line2 := []?string{}
	line2 << 'A\x00B\nC'
	line2 << 'Test 𝄞'
	jagged_array << line2
	println(jagged_array_to_string(jagged_array))
	
	bytes := encode_bsv(jagged_array)!
	decoded_jagged_array := decode_bsv(bytes)!
	println(jagged_array_to_string(decoded_jagged_array))
	
	save_bsv(jagged_array, 'Test.bsv')!
	loaded_jagged_array := load_bsv('Test.bsv')!
	println(jagged_array_to_string(loaded_jagged_array))
	save_bsv(loaded_jagged_array, 'TestResaved.bsv')!
}