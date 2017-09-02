/* 
 *  _____/\\\\\\\\\_____/\\\\\\\\\\\\\\\__/\\\\\_____/\\\__/\\\\\\\\\\\\\_______/\\\\\\\\\\\\_______/\\\\\______        
 *   ___/\\\\\\\\\\\\\__\///////\\\/////__\/\\\\\\___\/\\\_\/\\\/////////\\\___/\\\//////////______/\\\///\\\____       
 *    __/\\\/////////\\\_______\/\\\_______\/\\\/\\\__\/\\\_\/\\\_______\/\\\__/\\\_______________/\\\/__\///\\\__      
 *     _\/\\\_______\/\\\_______\/\\\_______\/\\\//\\\_\/\\\_\/\\\\\\\\\\\\\/__\/\\\____/\\\\\\\__/\\\______\//\\\_     
 *      _\/\\\\\\\\\\\\\\\_______\/\\\_______\/\\\\//\\\\/\\\_\/\\\/////////____\/\\\___\/////\\\_\/\\\_______\/\\\_    
 *       _\/\\\/////////\\\_______\/\\\_______\/\\\_\//\\\/\\\_\/\\\_____________\/\\\_______\/\\\_\//\\\______/\\\__   
 *        _\/\\\_______\/\\\_______\/\\\_______\/\\\__\//\\\\\\_\/\\\_____________\/\\\_______\/\\\__\///\\\__/\\\____  
 *         _\/\\\_______\/\\\_______\/\\\_______\/\\\___\//\\\\\_\/\\\_____________\//\\\\\\\\\\\\/_____\///\\\\\/_____ 
 *          _\///________\///________\///________\///_____\/////__\///_______________\////////////_________\/////_______
 */

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
        if (!fs.existsSync(neogut.basePath)) {
            fs.mkdirSync(neogut.basePath);
        }
        // Create the browser window.
        neogut.mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            'min-width': 800,
            'min-height': 600,
            'accept-first-mouse': true,
            'title-bar-style': 'hidden'
        });
        neogut.mainWindow.maximize();

        neogut.mainWindow.setMenu(null);

        // and load the index.html of the app.
        neogut.mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'index.html'),
            protocol: 'file:',
            slashes: true
        }));

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
    },
    listBooks: (callback) => {
        const books = [];
        fs.readdir(neogut.basePath, (err, files) => {
            files.forEach((f) => {
                books.push(f);
            });
            callback(books);
        });
    },
    listChapters: (book, callback) => {
        const chapters = [];
        const bookPath = path.join(neogut.basePath, book);
        fs.readdir(bookPath, (err, files) => {
            files.forEach((f) => {
                const chapterPath = path.join(bookPath, f);
                if (!fs.lstatSync(chapterPath).isDirectory() && !path.basename(chapterPath).startsWith('_')) {
                    chapters.push(f);
                }
            });
            callback(chapters);
        });
    },
    getChapter: (book, chapter, callback) => {
        fs.readFile(path.join(path.join(neogut.basePath, book), chapter), 'UTF-8', (err, contents) => {
            callback(contents);
        });
    },
    saveChapter: (book, chapter, contents, callback) => {
        fs.writeFile(path.join(path.join(neogut.basePath, book), chapter), contents, 'UTF-8', (err) => {
            if (err) {
                callback(err);
            } else {
                callback(null);
            }
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

exports.generateBook = neogut.generateBook;
exports.listBooks = neogut.listBooks;
exports.listChapters = neogut.listChapters;
exports.getChapter = neogut.getChapter;
exports.saveChapter = neogut.saveChapter;





exports.openDevTool = () => {
    neogut.mainWindow.webContents.openDevTools({mode: 'detach'});
};