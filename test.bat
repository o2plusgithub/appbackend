@echo off
set loopcount=2000
:loop
node test.js
echo %loopcount%
set /a loopcount=loopcount-1
if %loopcount%==0 goto exitloop
goto loop
:exitloop
pause