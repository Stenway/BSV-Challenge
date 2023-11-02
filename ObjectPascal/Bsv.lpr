program Bsv;
{$mode objfpc}{$H+}
{$codepage utf-8}

uses
	{$IFDEF UNIX}{$IFDEF UseCThreads}
	cthreads,
	{$ENDIF}{$ENDIF}
	{$IFDEF WINDOWS}
	Windows,
	{$ENDIF}
	SysUtils,
	Nullable,
	Classes;

type
	TNullableString = specialize TNullable<UTF8String>;
	TJaggedArrayLine = array of TNullableString;
	TJaggedArray = array of TJaggedArrayLine;

const
	utf8ByteClassLookup : array[0..255] of byte =
	(
		$1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1,
		$1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1,
		$1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1,
		$1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1,
		$1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1,
		$1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1,
		$1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1,
		$1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1, $1,
		$2, $2, $2, $2, $2, $2, $2, $2, $2, $2, $2, $2, $2, $2, $2, $2,
		$3, $3, $3, $3, $3, $3, $3, $3, $3, $3, $3, $3, $3, $3, $3, $3,
		$4, $4, $4, $4, $4, $4, $4, $4, $4, $4, $4, $4, $4, $4, $4, $4,
		$4, $4, $4, $4, $4, $4, $4, $4, $4, $4, $4, $4, $4, $4, $4, $4,
		$0, $0, $5, $5, $5, $5, $5, $5, $5, $5, $5, $5, $5, $5, $5, $5,
		$5, $5, $5, $5, $5, $5, $5, $5, $5, $5, $5, $5, $5, $5, $5, $5,
		$6, $7, $7, $7, $7, $7, $7, $7, $7, $7, $7, $7, $7, $8, $7, $7,
		$9, $A, $A, $A, $B, $0, $0, $0, $0, $0, $0, $0, $0, $0, $0, $0

	);

	utf8StateTransitionLookup : array[0..107] of byte =
	(
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
		0, 1, 0, 0, 0, 2, 3, 5, 4, 6, 7, 8,
		0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0
	);

function IsValidUtf8(str: UTF8String): boolean;
var
	startPointer, endPointer: PChar;
	lastState: byte;
	currentByte: byte;
	currentByteClass: byte;
	newStateLookupIndex: byte;
begin
	startPointer := PChar(str);
	endPointer := startPointer + Length(str);
	lastState := 1;
	while startPointer < endPointer do
	begin
		currentByte := byte(startPointer[0]);
		currentByteClass := utf8ByteClassLookup[currentByte];
		newStateLookupIndex := lastState*12+currentByteClass;
		lastState := utf8StateTransitionLookup[newStateLookupIndex];
		if lastState = 0 then Exit(false);
		inc(startPointer, 1);
	end;
	Result := (lastState = 1);
end;

function EncodeBsv(jaggedArray: TJaggedArray): TBytes;
var
	stream: TBytesStream;
	isFirstLine: boolean;
	isFirstValue: boolean;
	line: TJaggedArrayLine;
	value: TNullableString;
	valueBytes: TBytes;
begin
	stream := TBytesStream.Create;
	try
		isFirstLine := true;
		for line in jaggedArray do
		begin
			if not isFirstLine then stream.WriteByte($FF);
			isFirstLine := false;
			isFirstValue := true;
			for value in line do
			begin
				if not isFirstValue then stream.WriteByte($FE);
				isFirstValue := false;
				if value.IsNull then stream.WriteByte($FD)
				else if Length(value.Value) = 0 then stream.WriteByte($FC)
				else
				begin
					if not IsValidUtf8(value.Value) then raise Exception.Create('Invalid string value');
					valueBytes := TEncoding.UTF8.GetBytes(value.Value);
					stream.Write(valueBytes[0], Length(valueBytes));
				end;
			end;
		end;
		result := Copy(stream.Bytes, 0, stream.Size);
	finally
		stream.Free;
	end;
end;

function DecodeBsv(bytes: TBytes): TJaggedArray;
var
	currentIndex: integer;
	lastIndex: integer;
	valueBytesLength: integer;
	currentLine: TJaggedArrayLine;
	currentValue: UTF8String;
begin
	currentIndex := -1;
	currentLine := TJaggedArrayLine.Create;
	while true do
	begin
		lastIndex := currentIndex;
		while true do
		begin
			currentIndex := currentIndex + 1;
			if currentIndex >= Length(bytes) then
			begin
				currentIndex := -1;
				valueBytesLength := Length(bytes)-lastIndex-1;
				Break;
			end;
			if bytes[currentIndex] >= $FE then
			begin
				valueBytesLength := currentIndex-lastIndex-1;
				Break;
			end;
		end;
		if (valueBytesLength = 1) and (bytes[lastIndex+1] = $FD) then
		begin
			SetLength(currentLine, Length(currentLine)+1);
			currentLine[Length(currentLine)-1] := Default(TNullableString);
		end
		else if (valueBytesLength = 1) and (bytes[lastIndex+1] = $FC) then
		begin
			SetLength(currentLine, Length(currentLine)+1);
			currentLine[Length(currentLine)-1] := '';
		end
		else if valueBytesLength >= 1 then
		begin
			currentValue := TEncoding.UTF8.GetString(bytes, lastIndex+1, valueBytesLength);
			if not IsValidUtf8(currentValue) then raise Exception.Create('Invalid string value');
			SetLength(currentLine, Length(currentLine)+1);
			currentLine[Length(currentLine)-1] := currentValue;
		end
		else if ((((currentIndex >= 0) and (bytes[currentIndex] = $FF)) or (currentIndex < 0)) and ((lastIndex < 0) or ((lastIndex >= 0) and (bytes[lastIndex] = $FF)))) = false then
			raise Exception.Create('Invalid BSV value byte sequence');

		if currentIndex < 0 then Break
		else if (currentIndex >= 0) and (bytes[currentIndex] = $FF) then
		begin
			SetLength(result, Length(result)+1);
			result[Length(result)-1] := currentLine;
			currentLine := TJaggedArrayLine.Create;
		end;
	end;
	SetLength(result, Length(result)+1);
	result[Length(result)-1] := currentLine;
	currentLine := TJaggedArrayLine.Create;
end;

procedure SaveBytes(bytes: TBytes; filePath: string);
var
	fileStream: TFileStream;
begin
	fileStream := TFileStream.Create(filePath, fmCreate);
	try
		if bytes <> nil then
			fileStream.WriteBuffer(bytes[0], Length(bytes));
	finally
		fileStream.Free();
	end;
end;

function LoadBytes(filePath: string): TBytes;
var
	fileStream: TFileStream;
	size: integer;
begin
	fileStream := TFileStream.Create(filePath, fmOpenRead);
	try
		size := fileStream.Size;
		SetLength(result, size);
		fileStream.ReadBuffer(result[0], size);
	finally
		fileStream.Free();
	end;
end;

procedure SaveBsv(jaggedArray: TJaggedArray; filePath: string);
begin
	SaveBytes(EncodeBsv(jaggedArray), filePath);
end;

function LoadBsv(filePath: string): TJaggedArray;
begin
	result := DecodeBsv(LoadBytes(filePath));
end;

function JaggedArrayToString(jaggedArray: TJaggedArray): string;
var
	line: TJaggedArrayLine;
	isFirst: boolean;
	value: TNullableString;
begin
	result := '[';
	for line in jaggedArray do
	begin
		result := result + #$0A'	[';
		isFirst := true;
		for value in line do
		begin
			if not isFirst then result := result + ', ';
			isFirst := false;
			if value.IsNull then result := result + 'null'
			else result := result + '"' + value.Value + '"';
		end;
		result := result + ']';
	end;
	result := result + #$0A']';
end;

procedure Main();
var
	jaggedArray: TJaggedArray;
	bytes: TBytes;
	decodedJaggedArray: TJaggedArray;
	loadedJaggedArray: TJaggedArray;
begin
	jaggedArray := TJaggedArray.create(
		TJaggedArrayLine.create('Hello', '🌎', Default(TNullableString), ''),
		TJaggedArrayLine.create('A'#$00'B'#$0A'C', 'Test 𝄞')
	);

	WriteLn(JaggedArrayToString(jaggedArray));
	SaveBsv(jaggedArray, 'Test.bsv');

	bytes := EncodeBsv(jaggedArray);
	decodedJaggedArray := DecodeBsv(bytes);
	WriteLn(JaggedArrayToString(decodedJaggedArray));

	loadedJaggedArray := LoadBsv('Test.bsv');
	WriteLn(JaggedArrayToString(loadedJaggedArray));
	SaveBsv(loadedJaggedArray, 'TestResaved.bsv');

	ReadLn;
end;

begin
	SetConsoleOutputCP(CP_UTF8);
	Main();
end.
