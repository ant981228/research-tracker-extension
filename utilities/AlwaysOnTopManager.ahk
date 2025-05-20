#SingleInstance Force
#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.
SetBatchLines -1  ; Run at maximum speed

; Global variables
global WindowList := []
global ListViewHwnd := 0

; Create the GUI
Gui, Font, s10
Gui, Add, Text, x10 y10 w500 h20, Research Tracker - Always On Top Window Manager
Gui, Add, Button, x10 y40 w100 h30 gRefreshWindowList, Refresh List
Gui, Add, ListView, x10 y80 w600 h400 vWindowListView gWindowListView Grid, Window Title|Process|HWND|Always On Top
ListViewHwnd := A_GuiControl
Gui, Add, Button, x520 y40 w90 h30 gToggleSelected, Toggle Selected
Gui, Add, StatusBar,, Ready
Gui, Show, w620 h520, Always On Top Manager

; Initial window list population
RefreshWindowList()

return

; Handles the Refresh button click
RefreshWindowList() {
    ; Clear the current list
    GuiControl, -Redraw, WindowListView
    LV_Delete()
    WindowList := []
    
    ; Get all windows
    WinGet, winIdList, List, , , Program Manager
    
    ; Populate the ListView
    Loop, %winIdList% {
        winId := winIdList%A_Index%
        WinGetTitle, title, ahk_id %winId%
        
        ; Skip windows with empty titles or special system windows
        if (title = "" || title = "Start" || title = "Program Manager")
            continue
            
        ; Get process name
        WinGet, procName, ProcessName, ahk_id %winId%
        
        ; Check if window is set to be always on top
        WinGet, exStyle, ExStyle, ahk_id %winId%
        isAlwaysOnTop := (exStyle & 0x8) ? "Yes" : "No"
        
        ; Only add visible windows with titles
        if (title != "") {
            ; Add to our tracking array
            WindowList.Push({hwnd: winId, title: title, process: procName, alwaysOnTop: isAlwaysOnTop})
            
            ; Add to ListView
            LV_Add("", title, procName, winId, isAlwaysOnTop)
        }
    }
    
    ; Auto-size columns
    LV_ModifyCol(1, 300)
    LV_ModifyCol(2, 100)
    LV_ModifyCol(3, 80)
    LV_ModifyCol(4, "AutoHdr")
    
    GuiControl, +Redraw, WindowListView
    SB_SetText("Window list refreshed. Total windows: " . WindowList.Length())
}

; Handle ListView item clicks
WindowListView:
    if (A_GuiEvent = "DoubleClick") {
        ToggleSelectedWindow()
    }
return

; Toggle the Always On Top state for selected windows
ToggleSelected:
    ToggleSelectedWindow()
return

; Function to toggle Always On Top for the selected window
ToggleSelectedWindow() {
    ; Get the selected row
    rowNum := LV_GetNext(0)
    if (rowNum = 0) {
        SB_SetText("No window selected")
        return
    }
    
    ; Get the HWND from the selected row
    LV_GetText(hwnd, rowNum, 3)
    
    ; Toggle the Always On Top state
    WinGet, exStyle, ExStyle, ahk_id %hwnd%
    isAlwaysOnTop := exStyle & 0x8
    
    if (isAlwaysOnTop) {
        ; Remove Always On Top
        WinSet, AlwaysOnTop, Off, ahk_id %hwnd%
        LV_Modify(rowNum, "", , , , "No")
        SB_SetText("Turned off Always On Top for window: " . WindowList[rowNum].title)
    } else {
        ; Set Always On Top
        WinSet, AlwaysOnTop, On, ahk_id %hwnd%
        LV_Modify(rowNum, "", , , , "Yes")
        SB_SetText("Turned on Always On Top for window: " . WindowList[rowNum].title)
    }
    
    ; Update our tracking array
    WindowList[rowNum].alwaysOnTop := !isAlwaysOnTop ? "Yes" : "No"
}

; Clean up on exit
GuiClose:
GuiEscape:
    ExitApp
return