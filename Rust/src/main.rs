/* (C) Stefan John / Stenway / Stenway.com / 2023 */

use std::fs;

fn encode_bsv(jagged_array: &Vec<Vec<Option<String>>>) -> Vec<u8> {
    let mut parts: Vec<&[u8]> = vec![];
    let mut is_first_line = true;
    for line in jagged_array {
        if !is_first_line { parts.push(b"\xFF"); }
		is_first_line = false;
        let mut is_first_value = true;
        for value in line {
            if !is_first_value { parts.push(b"\xFE"); }
		    is_first_value = false;
            match value {
                None => parts.push(b"\xFD"),
                Some(str_value) => {
                    if str_value.is_empty() { parts.push(b"\xFC") }
                    else { parts.push(str_value.as_bytes()); }
                }
            }
        }
    }
    parts.concat()
}

fn decode_bsv(bytes: Vec<u8>) -> Vec<Vec<Option<String>>> {
    let mut result: Vec<Vec<Option<String>>> = vec![];
    let mut current_line: Vec<Option<String>> = vec![];
    let mut current_index = -1;
    loop {
        let last_index = current_index;
        loop {
            current_index += 1;
            if current_index >= bytes.len() as i64 { current_index = -1; break; }
            if bytes[current_index as usize] >= 0xFE { break; }
        }
        let value_bytes = &bytes[(last_index+1) as usize..(if current_index < 0 { bytes.len() } else { current_index as usize })];
		if value_bytes.len() == 1 && value_bytes[0] == 0xFD { current_line.push(None); }
		else if value_bytes.len() == 1 && value_bytes[0] == 0xFC { current_line.push(Some("".to_string())); }
		else if value_bytes.len() >= 1 {
            let str = String::from_utf8(value_bytes.to_vec()).expect("Invalid string value");
            current_line.push(Some(str));
        }
		else if (((current_index >= 0 && bytes[current_index as usize] == 0xFF) || (current_index < 0)) && ((last_index < 0) || (last_index >= 0 && bytes[last_index as usize] == 0xFF))) == false { panic!("Invalid BSV value byte sequence"); }
        if current_index < 0 { break; }
        else if current_index >= 0 && bytes[current_index as usize] == 0xFF {
			result.push(current_line);
			current_line = vec![];
		}
    }
    result.push(current_line);
    result
}

// ----------------------------------------------------------------------

fn save_bsv(path: &str, jagged_array: &Vec<Vec<Option<String>>>) {
    let bytes = encode_bsv(jagged_array);
    fs::write(path, bytes).expect("Could not save BSV file");
}

fn load_bsv(path: &str) -> Vec<Vec<Option<String>>> {
    let bytes = fs::read(path).expect("Could not load BSV file");
    decode_bsv(bytes)
}

// ----------------------------------------------------------------------

fn main() {
    let jagged_array = vec![
        vec![Some("Hello".to_string()), Some("🌎".to_string()), None, Some("".to_string())],
        vec![Some("A\0B\nC".to_string()), Some("Test 𝄞".to_string())],
    ];
    println!("{:?}", jagged_array);
    let bytes = encode_bsv(&jagged_array);
    println!("{:?}", bytes);
    
    let decoded_jagged_array = decode_bsv(bytes);
    println!("{:?}", decoded_jagged_array);
    
    save_bsv("Test.bsv", &jagged_array);
    save_bsv("Test2.bsv", &decoded_jagged_array);
    
    let loaded_jagged_array = load_bsv("Test.bsv");
    println!("{:?}", loaded_jagged_array);
}
