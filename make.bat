@echo off
setlocal

REM distディレクトリを丸ごとzip化するコマンド
set "dist_dir=dist"
set "zip_file=dist.zip"

echo 既存のzipファイルがあれば削除します
if exist "%zip_file%" del "%zip_file%"

echo productionビルドを実行します。
call npm run build

echo distディレクトリをzip化します
powershell Compress-Archive -Path "%dist_dir%\*" -DestinationPath "%zip_file%"

echo distディレクトリを%zip_file%に圧縮しました。

echo %zip_file% をアップロードしてください。
endlocal
