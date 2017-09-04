@RD /S /Q dist & ^
npm install & ^
npm run package-win & ^
npm run package-linux & ^
npm run create-installer-win-x64 & ^
npm run create-installer-win-ia32
REM npm run package-mac & ^
REM npm run create-installer-mac