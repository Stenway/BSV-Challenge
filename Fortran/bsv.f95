! (C) Stefan John / Stenway / Stenway.com / 2023

program bsv
    implicit none
    
    type :: TOptionalString
        character(len=:), allocatable :: value
    end type TOptionalString

    type :: TJaggedArrayLine
        type(TOptionalString), allocatable :: values(:)
    end type TJaggedArrayLine

    type :: TJaggedArray
        type(TJaggedArrayLine), allocatable :: lines(:)
    end type TJaggedArray
    
    type(TJaggedArray) :: jaggedArray
    type(TJaggedArray) :: loadedJaggedArray
    allocate(jaggedArray%lines(2))
    allocate(jaggedArray%lines(1)%values(4))
    allocate(jaggedArray%lines(2)%values(2))
    
    jaggedArray%lines(1)%values(1)%value = "Hello"
    jaggedArray%lines(1)%values(2)%value = "🌎"
    jaggedArray%lines(1)%values(4)%value = ""
    
    jaggedArray%lines(2)%values(1)%value = "A" // char(0) // "B" // char(10) // "C"
    jaggedArray%lines(2)%values(2)%value = "Test 𝄞"
    
    print *,jaggedArrayToString(jaggedArray)
    call saveBsv(jaggedArray, "Test.bsv")

    loadedJaggedArray = loadBsv("Test.bsv")
    print *,jaggedArrayToString(loadedJaggedArray)
    
    call saveBsv(loadedJaggedArray, "TestResaved.bsv")
contains
    function isValidUtf8(str) result(result)
        character(len=*), intent(in) :: str
        logical :: result
        integer :: i, currentByte, currentByteClass, newStateLookupIndex
        integer :: lastState = 1
        
        integer, dimension(256) :: utf8ByteClassLookup
        integer, dimension(108) :: utf8StateTransitionLookup
        
        utf8ByteClassLookup = (/ &
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, &
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, &
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, &
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, &
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, &
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, &
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, &
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, &
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, &
            3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, &
            4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, &
            4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, &
            0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, &
            5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, &
            6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 7, 7, &
            9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 &
        /)
        utf8StateTransitionLookup = (/ &
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, &
            0, 1, 0, 0, 0, 2, 3, 5, 4, 6, 7, 8, &
            0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, &
            0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, &
            0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, &
            0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, &
            0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0, 0, &
            0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, &
            0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0 &
        /)
        do i = 1, len(str)
            currentByte = ichar(str(i:i))
            currentByteClass = utf8ByteClassLookup(currentByte+1)
            newStateLookupIndex = lastState*12 + currentByteClass
            lastState = utf8StateTransitionLookup(newStateLookupIndex+1)
            if (lastState == 0) then
                result = .false.
                return
            endif
        end do
        result = (lastState == 1)
    end function

    ! ----------------------------------------------------------------------
    
    function getCount(str, char) result(result)
        character(len=*), Intent(In) :: str
        character(1) :: char
        integer :: result
        integer :: i
        result = 0
        do i = 1, len(str)
            if (str(i:i) == char) then
                result = result + 1
            end if
        end do
    end
    
    function getNextIndex(str, char, startIndex) result(result)
        character(len=*), Intent(In) :: str
        character(1) :: char
        integer :: result
        integer, Intent(In) :: startIndex
        integer :: i
        result = 0
        do i = startIndex, len(str)
            if (str(i:i) == char) then
                result = i
                return
            end if
        end do
    end
    
    ! ----------------------------------------------------------------------

    function encodeBsv(jaggedArray) result(result)
        type(TJaggedArray), Intent(In) :: jaggedArray
        type(TJaggedArrayLine) :: line
        type(TOptionalString) :: value
        character(len=:), allocatable :: result
        character(len=:), allocatable :: strValue
        integer :: i, j
        logical :: isFirstLine, isFirstValue
        
        result = ""
        isFirstLine = .true.
        do i = 1, size(jaggedArray%lines, 1)
            if (.not. isFirstLine) then
                result = result // char(255)
            end if
            isFirstLine = .false.
            isFirstValue = .true.
            line = jaggedArray%lines(i)
            do j = 1, size(line%values, 1)
                if (.not. isFirstValue) then
                    result = result // char(254)
                end if
                isFirstValue = .false.
                value = line%values(j)
                if (.not. allocated(value%value)) then
                    result = result // char(253)
                else if (len(value%value) == 0) then
                    result = result // char(252)
                else
                    strValue = value%value
                    if (.not. isValidUtf8(strValue)) then
                        stop "Invalid string value"
                    end if
                    result = result // strValue
                end if
            end do
        end do
    end function

    function decodeBsv(bytes) result(result)
        character(len=*), Intent(In) :: bytes
        type(TJaggedArray) :: result
        integer :: numLines, i, lastLineEnd, currentLineEnd
        integer :: numValues, j, lastValueEnd, currentValueEnd
        character(len=:), allocatable :: lineString
        character(len=:), allocatable :: valueString
        
        numLines = getCount(bytes, char(255)) + 1
        allocate(result%lines(numLines))
        lastLineEnd = 0
        do i = 1, numLines
            currentLineEnd = getNextIndex(bytes, char(255), lastLineEnd+1)
            if (currentLineEnd == 0) then
                currentLineEnd = len(bytes)+1
            end if
            lineString = bytes(lastLineEnd+1:currentLineEnd-1)
            lastLineEnd = currentLineEnd
            if (len(lineString) == 0) then
                numValues = 0
            else
                numValues = getCount(lineString, char(254)) + 1            
            end if
            allocate(result%lines(i)%values(numValues))
            lastValueEnd = 0
            do j = 1, numValues
                currentValueEnd = getNextIndex(lineString, char(254), lastValueEnd+1)
                if (currentValueEnd == 0) then
                    currentValueEnd = len(lineString)+1
                end if
                valueString = lineString(lastValueEnd+1:currentValueEnd-1)
                lastValueEnd = currentValueEnd
                if (len(valueString) == 1 .and. ichar(valueString(1:1)) == 253) then
                    
                else if (len(valueString) == 1 .and. ichar(valueString(1:1)) == 252) then
                    result%lines(i)%values(j)%value = ""
                else if (len(valueString) == 0) then
                    stop "Invalid BSV value byte sequence"
                else
                    if (.not. isValidUtf8(valueString)) then
                        stop "Invalid string value"
                    end if
                    result%lines(i)%values(j)%value = valueString
                end if
            end do
        end do
    end function
        
    ! ----------------------------------------------------------------------

    subroutine saveBsv(jaggedArray, filePath)
        type(TJaggedArray), Intent(In) :: jaggedArray
        character(len=*), Intent(In) :: filePath
        integer :: unit
        character(len=:), allocatable :: bytes
        
        bytes = encodeBsv(jaggedArray)
        open(newunit=unit, file=filePath)
        write(unit, "(a$)") bytes
        close(unit)
    end subroutine
    
    function loadBsv(filePath) result(result)
        character(len=*), Intent(In) :: filePath
        type(TJaggedArray) :: result
        character(len=:), allocatable :: bytes
        integer :: unit, fileSize
        
        open(newunit=unit, file=filePath, action="read", form="unformatted", access="stream")
        inquire(unit=unit, size=fileSize)
        allocate(character(len=fileSize) :: bytes)
        read(unit) bytes
        close(unit)
        
        result = decodeBsv(bytes)
    end function

    ! ----------------------------------------------------------------------

    function jaggedArrayToString(jaggedArray) result(result)
        type(TJaggedArray), Intent(In) :: jaggedArray
        type(TJaggedArrayLine) :: line
        type(TOptionalString) :: value
        character(len=:), allocatable :: result
        integer :: i, j
        logical :: isFirst
        
        result = "["
        do i = 1, size(jaggedArray%lines, 1)
            result = result // char(10) // "  ["
            isFirst = .true.
            line = jaggedArray%lines(i)
            do j = 1, size(line%values, 1)
                if (.not. isFirst) then
                    result = result // ", "
                end if
                isFirst = .false.
                value = line%values(j)
                if (.not. allocated(value%value)) then
                    result = result // "null"
                else if (len(value%value) == 0) then
                    result = result // char(34) // char(34)
                else
                    result = result // char(34) // value%value // char(34)
                end if
            end do
            result = result // "]"
        end do
        result = result // char(10) // "]"
    end function
end program