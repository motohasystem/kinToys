@echo off
setlocal

REM distディレクトリを丸ごとzip化するコマンド
set "dist_dir=dist"
set "zip_file=dist.zip"

REM 既存のzipファイルがあれば削除
if exist "%zip_file%" del "%zip_file%"

REM distディレクトリをzip化
powershell Compress-Archive -Path "%dist_dir%\*" -DestinationPath "%zip_file%"

echo distディレクトリを%zip_file%に圧縮しました。

endlocal
