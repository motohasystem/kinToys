@echo off
setlocal

REM dist�f�B���N�g�����ۂ���zip������R�}���h
set "dist_dir=dist"
set "zip_file=dist.zip"

REM ������zip�t�@�C��������΍폜
if exist "%zip_file%" del "%zip_file%"

REM dist�f�B���N�g����zip��
powershell Compress-Archive -Path "%dist_dir%\*" -DestinationPath "%zip_file%"

echo dist�f�B���N�g����%zip_file%�Ɉ��k���܂����B

endlocal
