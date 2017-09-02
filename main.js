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
const dialog = electron.dialog;
const BrowserWindow = electron.BrowserWindow;
const fs = require('fs-extra');
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
    generateBook: (book, authorName, progressCallback) => {
        return new Promise((resolve) => {
            const content = [];
            const bookFolder = path.join(neogut.basePath, book);
            fs.readdir(bookFolder, (err, files) => {
                progressCallback("Building content");
                files.forEach((file) => {
                    const fullPath = path.join(bookFolder, file);
                    const baseName = path.basename(file, '.md');
                    if (!fs.lstatSync(fullPath).isDirectory() && !path.basename(file).startsWith('_')) {
                        progressCallback("Building Chapter " + baseName);
                        content.push({
                            title: baseName.substring(2),
                            data: converter.makeHtml(fs.readFileSync(fullPath, 'UTF-8'))
                        });
                    }
                });

                progressCallback("Building ePub");
                const coverPath = path.join(path.join(bookFolder, '_assets'), 'cover.jpg');
                const fontsPath = path.join(path.join(bookFolder, '_assets'), 'fonts');

                const outPath = dialog.showOpenDialog({
                    title: 'Select output folder',
                    properties: ['openDirectory', 'createDirectory']
                });
                const epubPath = path.join(outPath[0], book + '.epub');
                const mobiPath = path.join(outPath[0], book + '.mobi');
                const options = {
                    output: epubPath,
                    title: book,
                    content,
                    author: 'ATNPGO',
                    publisher: 'NeoGutenberg',
                    appendChapterTitles: false
                };

                if (typeof authorName === 'string') {
                    options.author = authorName;
                }

                if (fs.existsSync(coverPath)) {
                    options.cover = coverPath;
                }

                new Epub(options).promise.then(function () {
                    progressCallback("Building mobi");
                    kindlegen(fs.readFileSync(epubPath), (error, mobi) => {
                        fs.writeFile(mobiPath, mobi, (err) => {
                            if (err) {
                                progressCallback(err);
                                resolve(false);
                            } else {
                                progressCallback("Ebooks Generated Successfully!");
                                resolve(true);
                            }
                        });
                    });
                }, (err) => {
                    progressCallback("Failed to generate epub because of " + err);
                    resolve(false);
                });
            });
        });
    },
    listBooks: () => {
        return new Promise((resolve) => {
            const books = [];
            fs.readdir(neogut.basePath, (err, files) => {
                files.forEach((f) => {
                    books.push(f);
                });
                resolve(books);
            });
        });
    },
    listChapters: (book) => {
        return new Promise((resolve) => {
            const chapters = [];
            const bookPath = path.join(neogut.basePath, book);
            fs.readdir(bookPath, (err, files) => {
                files.forEach((f) => {
                    const chapterPath = path.join(bookPath, f);
                    if (!fs.lstatSync(chapterPath).isDirectory() && !path.basename(chapterPath).startsWith('_')) {
                        chapters.push(f);
                    }
                });
                resolve(chapters);
            });
        });
    },
    getChapter: (book, chapter) => {
        return new Promise((resolve) => {
            fs.readFile(path.join(path.join(neogut.basePath, book), chapter), 'UTF-8', (err, contents) => {
                resolve(contents);
            });
        });
    },
    saveChapter: (book, chapter, contents) => {
        return new Promise((resolve) => {
            fs.writeFile(path.join(path.join(neogut.basePath, book), chapter), contents, 'UTF-8', (err) => {
                if (err) {
                    resolve(err);
                } else {
                    resolve(null);
                }
            });
        });
    },
    createBook: (book) => {
        return new Promise((resolve) => {
            const bookPath = path.join(neogut.basePath, book);
            if (!fs.existsSync(bookPath)) {
                fs.mkdirSync(bookPath);
                const assetsPath = path.join(bookPath, '_assets')
                fs.mkdirSync(assetsPath);
                fs.mkdirSync(path.join(assetsPath, 'css'));
                fs.mkdirSync(path.join(assetsPath, 'scss'));
                fs.mkdirSync(path.join(assetsPath, 'fonts'));
                fs.mkdirSync(path.join(assetsPath, 'images'));
                resolve(true);
            } else {
                resolve(false);
            }
        });
    },
    createChapter: (book, chapter) => {
        return new Promise((resolve) => {
            const bookPath = path.join(neogut.basePath, book), chapterPath = path.join(bookPath, chapter);
            if (!fs.existsSync(chapterPath)) {
                neogut.saveChapter(book, chapter + '.md', '# ' + chapter.substring(chapter.indexOf('.') + 2) + '\n\n');
                resolve(true);
            } else {
                resolve(false);
            }
        });
    },
    getBookFonts: (book) => {
        return new Promise((resolve) => {
            const fonts = [];
            const fontsPath = path.join(path.join(path.join(neogut.basePath, book), '_assets'), 'fonts');
            fs.readdir(fontsPath, (err, files) => {
                files.forEach((f) => {
                    const chapterPath = path.join(fontsPath, f);
                    if (fs.lstatSync(chapterPath).isDirectory() && !path.basename(chapterPath).startsWith('_')) {
                        fonts.push(f);
                    }
                });
                resolve(fonts);
            });
        });
    },
    addFont: (book, font) => {
        return new Promise((resolve) => {
            const input = path.join(path.join(__dirname, 'fonts'), font);
            const output = path.join(path.join(path.join(path.join(neogut.basePath, book), '_assets'), 'fonts'), font);
            if (!fs.existsSync(output)) {
                fs.mkdirSync(output);
            }
            fs.copy(input, output).then(resolve);
        });
    },
    removeFont: (book, font) => {
        return new Promise((resolve) => {
            fs.emptyDir(path.join(path.join(path.join(path.join(neogut.basePath, book), '_assets'), 'fonts'), font)).then(() => {
                fs.rmdir(path.join(path.join(path.join(path.join(neogut.basePath, book), '_assets'), 'fonts'), font)).then(resolve);
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

exports.generateBook = neogut.generateBook;
exports.listBooks = neogut.listBooks;
exports.listChapters = neogut.listChapters;
exports.getChapter = neogut.getChapter;
exports.saveChapter = neogut.saveChapter;
exports.createBook = neogut.createBook;
exports.createChapter = neogut.createChapter;
exports.addFont = neogut.addFont;
exports.removeFont = neogut.removeFont;
exports.getBookFonts = neogut.getBookFonts;





exports.openDevTool = () => {
    neogut.mainWindow.webContents.openDevTools({mode: 'detach'});
};