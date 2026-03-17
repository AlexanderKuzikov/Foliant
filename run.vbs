' Запускает утилиту без окна терминала
Dim objShell
Set objShell = WScript.CreateObject("WScript.Shell")
objShell.CurrentDirectory = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
objShell.Run "node dist\index.js", 0, False
Set objShell = Nothing
