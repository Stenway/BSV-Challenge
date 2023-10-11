// (C) Stefan John / Stenway / Stenway.com / 2023

const std = @import("std");

pub const BsvError = error{ InvalidStringValue, InvalidBsvByteSequence };

fn encodeBsv(jagged_array: std.ArrayList(std.ArrayList(?[]const u8)), allocator: std.mem.Allocator) ![]const u8 {
    var result = std.ArrayList([]const u8).init(allocator);
    defer result.deinit();
    var result_length: usize = 0;
    var is_first_line = true;
    for (jagged_array.items) |line| {
        if (!is_first_line) {
            try result.append("\xFF");
            result_length += 1;
        }
        is_first_line = false;
        var is_first_value = true;
        for (line.items) |value| {
            if (!is_first_value) {
                try result.append("\xFE");
                result_length += 1;
            }
            is_first_value = false;
            if (value) |strValue| {
                if (strValue.len == 0) {
                    try result.append("\xFC");
                    result_length += 1;
                } else {
                    if (!std.unicode.utf8ValidateSlice(strValue)) {
                        return error.InvalidStringValue;
                    }
                    try result.append(strValue);
                    result_length += strValue.len;
                }
            } else {
                try result.append("\xFD");
                result_length += 1;
            }
        }
    }
    var result_str = try allocator.alloc(u8, result_length);
    var index: usize = 0;
    for (result.items) |result_part| {
        std.mem.copy(u8, result_str[index..], result_part);
        index += result_part.len;
    }
    return result_str;
}

fn decodeBsv(bytes: []u8, allocator: std.mem.Allocator) !std.ArrayList(std.ArrayList(?[]const u8)) {
    var result = std.ArrayList(std.ArrayList(?[]const u8)).init(allocator);
    var current_line = std.ArrayList(?[]const u8).init(allocator);
    var current_index: i64 = -1;
    while (true) {
        var last_index = current_index;
        while (true) {
            current_index += 1;
            if (current_index >= bytes.len) {
                current_index = -1;
                break;
            }
            if (bytes[@intCast(current_index)] >= 0xFE) {
                break;
            }
        }
        var end_index: usize = if (current_index < 0) bytes.len else @intCast(current_index);
        var value_bytes = bytes[@intCast(last_index + 1)..end_index];
        if (value_bytes.len == 1 and value_bytes[0] == 0xFD) {
            try current_line.append(null);
        } else if (value_bytes.len == 1 and value_bytes[0] == 0xFC) {
            try current_line.append("");
        } else if (value_bytes.len >= 1) {
            if (!std.unicode.utf8ValidateSlice(value_bytes)) {
                return error.InvalidStringValue;
            }
            try current_line.append(try std.mem.Allocator.dupe(allocator, u8, value_bytes));
        } else if ((((current_index >= 0 and bytes[@intCast(current_index)] == 0xFF) or (current_index < 0)) and ((last_index < 0) or (last_index >= 0 and bytes[@intCast(last_index)] == 0xFF))) == false) {
            return error.InvalidBsvByteSequence;
        }
        if (current_index < 0) {
            break;
        } else if (current_index >= 0 and bytes[@intCast(current_index)] == 0xFF) {
            try result.append(current_line);
            current_line = std.ArrayList(?[]const u8).init(allocator);
        }
    }
    try result.append(current_line);
    return result;
}

// ----------------------------------------------------------------------

fn saveBsv(jagged_array: std.ArrayList(std.ArrayList(?[]const u8)), file_name: []const u8, allocator: std.mem.Allocator) !void {
    const file = try std.fs.cwd().createFile(file_name, .{});
    defer file.close();

    const bytes = try encodeBsv(jagged_array, allocator);
    defer allocator.free(bytes);

    try file.writeAll(bytes);
}

fn loadBsv(file_name: []const u8, allocator: std.mem.Allocator) !std.ArrayList(std.ArrayList(?[]const u8)) {
    const file = try std.fs.cwd().openFile(file_name, .{});
    defer file.close();
    const file_size = (try file.stat()).size;
    const bytes = try file.readToEndAlloc(allocator, file_size);
    defer allocator.free(bytes);

    return decodeBsv(bytes, allocator);
}

// ----------------------------------------------------------------------

fn jaggedArrayToString(jagged_arrray: std.ArrayList(std.ArrayList(?[]const u8)), allocator: std.mem.Allocator) ![]const u8 {
    var result = std.ArrayList([]const u8).init(allocator);
    defer result.deinit();
    var result_length: usize = 0;
    try result.append("[");
    result_length += 1;
    for (jagged_arrray.items) |line| {
        try result.append("\n  [");
        result_length += 4;
        var is_first = true;
        for (line.items) |value| {
            if (!is_first) {
                try result.append(", ");
                result_length += 2;
            }
            is_first = false;
            if (value) |strValue| {
                try result.append("\"");
                result_length += 1;
                try result.append(strValue);
                result_length += strValue.len;
                try result.append("\"");
                result_length += 1;
            } else {
                try result.append("null");
                result_length += 4;
            }
        }
        try result.append("]");
        result_length += 1;
    }
    try result.append("\n]");
    result_length += 2;
    var result_str = try allocator.alloc(u8, result_length);
    var index: usize = 0;
    for (result.items) |result_part| {
        std.mem.copy(u8, result_str[index..], result_part);
        index += result_part.len;
    }
    return result_str;
}

fn printJaggedArray(jagged_arrray: std.ArrayList(std.ArrayList(?[]const u8)), allocator: std.mem.Allocator) !void {
    var str = try jaggedArrayToString(jagged_arrray, allocator);
    std.debug.print("{s}\n", .{str});
}

// ----------------------------------------------------------------------

pub fn main() !void {
    var allocator = std.heap.page_allocator;

    var jagged_array = std.ArrayList(std.ArrayList(?[]const u8)).init(allocator);

    var line_1 = std.ArrayList(?[]const u8).init(allocator);
    try line_1.append("Hello");
    try line_1.append("🌎");
    try line_1.append(null);
    try line_1.append("");
    try jagged_array.append(line_1);

    var line_2 = std.ArrayList(?[]const u8).init(allocator);
    try line_2.append("A\x00B\nC");
    try line_2.append("Test 𝄞");
    try jagged_array.append(line_2);

    try saveBsv(jagged_array, "Test.bsv", allocator);

    const loaded_jagged_array = try loadBsv("Test.bsv", allocator);
    try printJaggedArray(loaded_jagged_array, allocator);
}
