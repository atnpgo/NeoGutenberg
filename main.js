/* global __dirname */

const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const fs = require('fs');
const path = require('path');
const url = require('url');
const Epub = require("epub-gen");
const kindlegen = require("kindlegen");
const showdown = require('showdown');
const converter = new showdown.Converter({
    strikethrough: true,
    tables: true
});

const neogut = {
    /**
     * global reference of the window object
     * @type BrowserWindow
     */
    mainWindow: null,
    /**
     * The base path
     * @type String
     */
    basePath: null,
    /**
     * Creates a window
     * @returns {undefined}
     */
    createWindow: () => {

        neogut.basePath = path.join(app.getPath('documents'), 'NeoGutenberg');
        // Create the browser window.
        neogut.mainWindow = new BrowserWindow({
            width: 800,
            height: 600
        });

        // and load the index.html of the app.
        neogut.mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'index.html'),
            protocol: 'file:',
            slashes: true
        }));

        // Open the DevTools.
        neogut.mainWindow.webContents.openDevTools()

        // Emitted when the window is closed.
        neogut.mainWindow.on('closed', () => {
            // when you should delete the corresponding element.
            neogut.mainWindow = null;
        });
    },
    generateBook: (title, callback) => {
        const content = [];
        const bookFolder = path.join(neogut.basePath, title);
        fs.readdir(bookFolder, (err, files) => {
            callback("Building content");
            files.forEach((file) => {
                const fullPath = path.join(bookFolder, file);
                const baseName = path.basename(file, '.md');
                if (!fs.lstatSync(fullPath).isDirectory() && !path.basename(file).startsWith('_')) {
                    callback("Building Chapter " + baseName);
                    content.push({
                        title: baseName.substring(2),
                        data: converter.makeHtml(fs.readFileSync(fullPath, 'UTF-8'))
                    });
                }
            });

            callback("Building ePub");
            const coverPath = path.join(path.join(bookFolder, '_assets'), 'cover.jpg');
            const epubPath = path.join(path.join(bookFolder, '_out'), title + '.epub');
            const mobiPath = path.join(path.join(bookFolder, '_out'), title + '.mobi');

            new Epub({
                output: epubPath,
                title,
                content,
                author: 'ATNPGO',
                publisher: 'NeoGutenberg',
                cover: fs.existsSync(coverPath) ? coverPath : null
            }).promise.then(function () {
                callback("Building mobi");
                kindlegen(fs.readFileSync(epubPath), (error, mobi) => {
                    callback("Building mobi");
                    fs.writeFile(mobiPath, mobi, (err) => {
                        if (err) {
                            callback(err);
                        } else {
                            callback("Ebooks Generated Successfully!");
                        }
                    });
                });
            }, (err) => {
                callback("Failed to generate epub because of " + err);
            });



        });
    }
};


app.on('ready', neogut.createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // wait for cmd + Q
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

exports.test = neogut.generateBook;

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
