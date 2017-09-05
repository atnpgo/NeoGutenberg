
function getOS() {
    var userAgent = window.navigator.userAgent,
            platform = window.navigator.platform,
            macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
            windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
            iosPlatforms = ['iPhone', 'iPad', 'iPod'],
            os = null;
    if (macosPlatforms.indexOf(platform) !== -1) {
        os = 'Mac OS';
    } else if (iosPlatforms.indexOf(platform) !== -1) {
        os = 'iOS';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
        os = 'Windows';
    } else if (/Android/.test(userAgent)) {
        os = 'Android';
    } else if (!os && /Linux/.test(platform)) {
        os = 'Linux';
    }

    return os;
}

$(document).ready(function (e) {
    $('#btn-download-now').click(function () {
        var distFolder = 'https://raw.githubusercontent.com/atnpgo/NeoGutenberg/master/dist/';
        switch (getOS()) {
            case 'Windows':
                if (navigator.userAgent.indexOf('64') !== -1) {
                    window.location = distFolder + 'NeoGutenbergInstaller.x64.exe';
                } else {
                    window.location = distFolder + 'NeoGutenbergInstaller.ia32.exe';
                }
                break;
            case 'Mac OS':
                window.location = distFolder + 'NeoGutenberg.dmg';
                break;
            case 'Linux':
                if (navigator.userAgent.indexOf('64') !== -1) {
                    window.location = distFolder + 'NeoGutenberg-linux-x64.zip';
                } else if (navigator.userAgent.indexOf('32') !== -1) {
                    window.location = distFolder + 'NeoGutenberg-linux-ia32.zip';
                } else {
                    window.location = distFolder + 'NeoGutenberg-linux-armv7l.zip';
                }
                break;
            default:

        }
    });
});
