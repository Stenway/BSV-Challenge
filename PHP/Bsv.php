<?php
/* (C) Stefan John / Stenway / Stenway.com / 2023 */

function encodeBsv(array $jaggedArray) : string {
	$parts = [];
	$isFirstLine = true;
	foreach ($jaggedArray as $line) {
		if (!is_array($line)) { throw new \Exception("Invalid jagged array"); }
		if ($isFirstLine === false) { array_push($parts, "\xFF"); }
		$isFirstLine = false;
		$isFirstValue = true;
		foreach ($line as $value) {
			if ($isFirstValue === false) { array_push($parts, "\xFE"); }
			$isFirstValue = false;
			if ($value === null) { array_push($parts, "\xFD"); }
			else if (!is_string($value)) { throw new \Exception("Invalid jagged array value"); }
			else if (strlen($value) === 0) { array_push($parts, "\xFC"); }
			else if (mb_check_encoding($value, "utf8") === false) { throw new \Exception("Invalid UTF-8 string"); }
			else { array_push($parts, $value); }
		}
	}
	return join($parts);
}

function decodeBsv(string $bytes) : array {
	$result = [];
	$currentLine = [];
	$currentIndex = -1;
	for (;;) {
		$lastIndex = $currentIndex;
		for (;;) {
			$currentIndex++;
			if ($currentIndex >= strlen($bytes)) { $currentIndex = -1; break; }
			if (ord($bytes[$currentIndex]) >= 0xFE) { break; }
			
		}
		
		$valueBytes = substr($bytes, $lastIndex+1, $currentIndex < 0 ? strlen($bytes) - $currentIndex - 1 : $currentIndex-$lastIndex-1);
		if (strlen($valueBytes) === 1 && ord($valueBytes[0]) === 0xFD) { array_push($currentLine, null); }
		else if (strlen($valueBytes) === 1 && ord($valueBytes[0]) == 0xFC) { array_push($currentLine, ""); }
		else if (strlen($valueBytes) >= 1) {
			if (mb_check_encoding($valueBytes, "utf8") === false) { throw new \Exception("Invalid UTF-8 string"); }
			array_push($currentLine, $valueBytes); 
		} else if (((($currentIndex >= 0 && ord($bytes[$currentIndex]) === 0xFF) || ($currentIndex < 0)) && (($lastIndex < 0) || ($lastIndex >= 0 && ord($bytes[$lastIndex]) === 0xFF))) === false) { throw new \Exception("Invalid BSV value byte sequence"); }
		if ($currentIndex < 0) { break; }
		else if ($currentIndex >= 0 && ord($bytes[$currentIndex]) === 0xFF) {
			array_push($result, $currentLine);
			$currentLine = [];
		}
	}
	array_push($result, $currentLine);
	return $result;
}

// ----------------------------------------------------------------------

function saveBsv(array $jaggedArray, string $filePath) {
	$bytes = encodeBsv($jaggedArray);
	$result = file_put_contents($filePath, $bytes);
	if ($result !== strlen($bytes)) { throw new \Exception("BSV file not fully written"); }
}

function loadBsv(string $filePath) : array {
	$bytes = file_get_contents($filePath);
	if ($bytes === false) { throw new \Exception("BSV file could not be read"); }
	return decodeBsv($bytes);
}

function appendBsv(array $jaggedArray, string $filePath) {
	$existed = true;
	$file = @fopen($filePath, "r+");
	if ($file === false) {
		$existed = false;
		$file = @fopen($filePath, "x");
		if ($file === false) { throw new \Exception("Could not append BSV"); }
	}
	if ($existed === true) {
		fseek($file, 0, SEEK_END);
		if (fwrite($file, "\xFF") !== 1) { throw new \Exception("Could write line break byte"); }
	}
	$bytes = encodeBsv($jaggedArray);
	if (fwrite($file, $bytes) !== strlen($bytes)) { throw new \Exception("Could write BSV bytes"); }
	if (fclose($file) === false) { throw new \Exception("Could not close file handle"); }
}

// ----------------------------------------------------------------------

$jaggedArray = [["Hello", "🌎", null, ""], ["A\0B\nC", "Test 𝄞"]];
//var_dump($jaggedArray);
$bytes = encodeBsv($jaggedArray);
//var_dump(unpack('C*', $bytes));
saveBsv($jaggedArray, "Test.bsv");

$decodedJaggedArray = decodeBsv($bytes);
saveBsv($decodedJaggedArray, "TestResaved.bsv");
//var_dump($decodedJaggedArray);

$loadedJaggedArray = loadBsv("Test.bsv");
//var_dump($loadedJaggedArray);
appendBsv([["ABC"]], "Append.bsv");
appendBsv([["DEF"]], "Append.bsv");

?>