' (C) Stefan John / Stenway / Stenway.com / 2023

Imports System
Imports System.Linq
Imports System.Collections.Generic
Imports System.Text
Imports System.IO

Module Bsv
	Function EncodeBsv(jaggedArray As String()()) As Byte()
		Dim parts = New List(Of Byte())()
		Dim lineBreakByte = New Byte() {&Hff}
		Dim valueSeparatorByte = New Byte() {&Hfe}
		Dim nullValueByte = New Byte() {&Hfd}
		Dim emptyStringByte = New Byte() {&Hfc}
		Dim encoder = New UTF8Encoding(False, True)
		Dim isFirstLine = True
		For Each line As String() In jaggedArray
			If isFirstLine = False Then
				parts.Add(lineBreakByte)
			End If
			isFirstLine = False
			Dim isFirstValue = True
			For Each value As String In line
				If isFirstValue = False Then
					parts.Add(valueSeparatorByte)
				End If
				isFirstValue = False
				If value Is Nothing Then
					parts.Add(nullValueByte)
				ElseIf value.Length = 0 Then
					parts.Add(emptyStringByte)
				Else
					parts.Add(encoder.GetBytes(value))
				End If
			Next
		Next
		Dim result = New Byte(parts.Sum(Function(part) part.Length) - 1) {}
		Dim stream = New MemoryStream(result)
		For Each part As Byte() In parts
			stream.Write(part, 0, part.Length)
		Next
		Return result
	End Function
	
	Function DecodeBsv(bytes As Byte()) As String()()
		Dim decoder = New UTF8Encoding(False, True)
		Dim result = New List(Of String())()
		Dim currentLine = New List(Of String)()
		Dim currentIndex = -1
		While True
			Dim lastIndex = currentIndex
			While True
				currentIndex += 1
				If currentIndex >= bytes.Length Then
					currentIndex = -1
					Exit While
				End If
				If bytes(currentIndex) >= &Hfe Then
					Exit While
				End If
			End While
			Dim valueBytes = If(currentIndex < 0, bytes.Skip(lastIndex + 1).ToArray(), bytes.Skip(lastIndex + 1).Take(currentIndex - lastIndex - 1).ToArray())
			If valueBytes.Length = 1 AndAlso valueBytes(0) = &Hfd Then
				currentLine.Add(Nothing)
			ElseIf valueBytes.Length = 1 AndAlso valueBytes(0) = &Hfc Then
				currentLine.Add("")
			ElseIf valueBytes.Length >= 1 Then
				currentLine.Add(decoder.GetString(valueBytes))
			ElseIf (((currentIndex >= 0 AndAlso bytes(currentIndex) = &Hff) OrElse (currentIndex < 0)) AndAlso ((lastIndex < 0) OrElse (lastIndex >= 0 AndAlso bytes(lastIndex) = &Hff))) = False Then
				Throw New Exception("Invalid BSV value byte sequence")
			End If
			If currentIndex < 0 Then
				Exit While
			ElseIf currentIndex >= 0 AndAlso bytes(currentIndex) = &Hff Then
				result.Add(currentLine.ToArray())
				currentLine.Clear()
			End If
		End While
		result.Add(currentLine.ToArray())
		Return result.ToArray()
	End Function
	
	' ----------------------------------------------------------------------

	Sub SaveBsv(jaggedArray As String()(), filePath As String)
		File.WriteAllBytes(filePath, EncodeBsv(jaggedArray))
	End Sub
	
	Function LoadBsv(filePath As String) As String()()
		Return DecodeBsv(File.ReadAllBytes(filePath))
	End Function
	
	Sub AppendBsv(jaggedArray As String()(), filePath As String)
		Dim handle As FileStream
		Dim existed As Boolean
		Try
			handle = File.Open(filePath, FileMode.Open, FileAccess.Write)
			existed = True
		Catch exception As FileNotFoundException
			handle = File.Open(filePath, FileMode.CreateNew, FileAccess.Write)
			existed = False
		End Try
		Try
			handle.Position = handle.Length
			If existed = True Then
				handle.Write(New Byte() {&Hff}, 0, 1)
			End If
			Dim bytes = EncodeBsv(jaggedArray)
			handle.Write(bytes, 0, bytes.Length)
		Finally
			handle.Close()
		End Try
	End Sub
	
	' ----------------------------------------------------------------------

	Function JaggedArrayToString(ByVal jaggedArray As String()()) As String
    	Return "[" & vbLf & String.Join(
			vbLf,
			jaggedArray.Select(Function(line) "  [" & String.Join(
				", ",
				line.Select(Function(x) If(x Is Nothing, "null", """" & x.Replace(vbLf, "\n").Replace(vbNullChar, "\0") & """"))
			) & "]")
		) & vbLf & "]"
	End Function
	
	Sub PrintJaggedArray(ByVal jaggedArray As String()())
		Console.WriteLine(JaggedArrayToString(jaggedArray))
	End Sub
	
	Function ByteArrayToString(bytes As Byte()) As String
		Return "[" & String.Join(", ", bytes) & "]"
	End Function
	
	' ----------------------------------------------------------------------

	Sub Main()
		Console.OutputEncoding = System.Text.Encoding.UTF8
	
		Dim jaggedArray As String()() = {
			New String() {"Hello", "🌎", Nothing, ""},
			New String() {"A" & vbNullChar & "B" & vbLf & "C", "Test 𝄞"}
		}
		PrintJaggedArray(jaggedArray)
		
		Dim bytes = EncodeBsv(jaggedArray)
		Console.WriteLine(ByteArrayToString(bytes))

		Dim decodedJaggedArray = DecodeBsv(bytes)
		PrintJaggedArray(decodedJaggedArray)
		
		SaveBsv(jaggedArray, "Test.bsv")
		
		Dim loadedJaggedArray As String()() = LoadBsv("Test.bsv") 
		PrintJaggedArray(loadedJaggedArray)
		SaveBsv(loadedJaggedArray, "TestResaved.bsv")
		
		AppendBsv({New String() {"ABC"}}, "Append.bsv")
		PrintJaggedArray(LoadBsv("Append.bsv"))
		
		Console.ReadKey()
	End Sub
End Module