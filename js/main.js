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
    } else if (/Linux/.test(platform)) {
        os = 'Linux';
    }

    return os;
}

$(document).ready(function (e) {
    $('#btn-download-now').click(function () {
        var distFolder = 'https://github.com/atnpgo/NeoGutenberg/releases/download/v0.1.2/';
        switch (getOS()) {
            case 'Mac OS':
                window.location = distFolder + 'NeoGutenberg-0.1.2.dmg';
                break;
            case 'Linux':
                window.location = distFolder + 'NeoGutenberg-0.1.2.AppImage';
                break;
            case 'Windows':
            default:
                window.location = distFolder + 'NeoGutenberg.Setup.0.1.2.exe';
                break;

        }
    });
});
