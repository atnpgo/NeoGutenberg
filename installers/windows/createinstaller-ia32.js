/* global Promise */

const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller;
const path = require('path');

getInstallerConfig()
        .then(createWindowsInstaller)
        .catch((error) => {
            console.error(error.message || error);
            process.exit(1);
        });

function getInstallerConfig() {
    console.log('creating windows installer');
    const rootPath = path.join('./');
    const outPath = path.join(rootPath, 'release-builds');

    return Promise.resolve({
        appDirectory: path.join(outPath, 'NeoGutenberg-win32-ia32/'),
        authors: 'Etienne Pageau',
        noMsi: true,
        outputDirectory: path.join(rootPath, 'dist'),
        exe: 'NeoGutenberg.exe',
        setupExe: 'NeoGutenbergInstaller.ia32.exe',
        setupIcon: path.join(rootPath, 'logo', 'logo.ico')
    });
}