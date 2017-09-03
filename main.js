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

/* global __dirname, Promise */

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
const compile = require('./js/sass.js/sass.node');
const _ = require('./js/underscore-1.8.3.min');
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
        const create = () => {
            neogut.mainWindow = new BrowserWindow({
                width: 800,
                height: 600,
                'min-width': 800,
                'min-height': 600,
                icon: './logo/logo.png',
                'accept-first-mouse': true,
                'title-bar-style': 'hidden'
            });
            neogut.mainWindow.maximize();
            neogut.mainWindow.setMenu(null);
            neogut.mainWindow.loadURL(url.format({
                pathname: path.join(__dirname, 'index.html'),
                protocol: 'file:',
                slashes: true
            }));
            neogut.mainWindow.on('closed', () => {
                neogut.mainWindow = null;
            });
        };
        if (!fs.existsSync(neogut.basePath)) {
            fs.mkdirSync(neogut.basePath);
            const book = 'Guide', chapter = '1. Quick Reference';
            neogut.createBook(book).then(() => {
                neogut.createChapter(book, chapter).then(() => {
                    neogut.saveChapter(book, chapter + '.md',
                            `Adapted from Adam Pritchard's markdown cheatsheethttps://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet

# H1
## H2
### H3
#### H4
##### H5
###### H6

Alternatively, for H1 and H2, an underline-ish style:

Alt-H1
======

Alt-H2
------

# Emphasis

Emphasis, aka italics, with *asterisks* or _underscores_.

Strong emphasis, aka bold, with **asterisks** or __underscores__.

Combined emphasis with **asterisks and _underscores_**.

Strikethrough uses two tildes. ~~Scratch this.~~

# Lists

1. First ordered list item
2. Another item
    * Unordered sub-list. 
1. Actual numbers don't matter, just that it's a number
    1. Ordered sub-list
4. And another item.

 You can have properly indented paragraphs within list items. Notice the blank line above, 
 and the leading spaces.

 To have a line break without a paragraph, you will need to use two trailing spaces.  
 Note that this line is separate, but within the same paragraph.

* Unordered list can use asterisks
- Or minuses
+ Or pluses

# Links

# Images
![alt text](https://raw.githubusercontent.com/atnpgo/NeoGutenberg/master/logo/logo.svg)


# Tables

Colons can be used to align columns.

| Tables        | Are           | Cool  |
| ------------- |:-------------:| -----:|
| col 3 is      | right-aligned | $1600 |
| col 2 is      | centered      |   $12 |
| zebra stripes | are neat      |    $1 |

There must be at least 3 dashes separating each header cell.
The outer pipes (|) are optional, and you don't need to make the 
raw Markdown line up prettily. You can also use inline Markdown.

Markdown | Less | Pretty
--- | --- | ---
*Still* | \`renders\` | **nicely**
1 | 2 | 3

# Blockquotes

> Blockquotes are very handy in email to emulate reply text.
> This line is part of the same quote.

Quote break.

> This is a very long line that will still be quoted properly when it wraps. Oh boy let's keep writing to make sure this is long enough to actually wrap for everyone. Oh, you can *put* **Markdown** into a blockquote. 

# Inline HTML

<dl>
  <dt>Definition list</dt>
  <dd>Is something people use sometimes.</dd>

  <dt>Markdown in HTML</dt>
  <dd>Does *not* work **very** well. Use HTML <em>tags</em>.</dd>
</dl>

# Horizontal Rule

Three or more...

---

Hyphens

***

Asterisks

___

Underscores

# Line Breaks

Here's a line for us to start with.

This line is separated from the one above by two newlines, so it will be a *separate paragraph*.

This line is also a separate paragraph, but...
This line is only separated by a single newline, so it's a separate line in the *same paragraph*.

# Code

Inline \`code\` has \`back-ticks around\` it.

Use triple backticks to preserve formating.
\`\`\`
var s = "Multi-line code example";
alert(s);
\`\`\`
`).then(create);
                });
            });

        } else {
            create();
        }
    },
    generateBook: (book, authorName, progressCallback) => {
        return new Promise((resolve) => {
            const content = [];
            const bookFolder = path.join(neogut.basePath, book);
            fs.readdir(bookFolder, (err, files) => {
                progressCallback("Building content");

                const chapters = [];
                files.forEach((file) => {
                    const fullPath = path.join(bookFolder, file);
                    const baseName = path.basename(file, '.md');
                    if (!fs.lstatSync(fullPath).isDirectory() && !path.basename(file).startsWith('_')) {
                        chapters.push(file);
                    }
                });

                _.sortBy(chapters, (chapter) => {
                    return Number.parseInt(chapter.substring(0, chapter.indexOf('.')));
                }).forEach((file) => {
                    const fullPath = path.join(bookFolder, file);
                    const baseName = path.basename(file, '.md');
                    progressCallback("Building Chapter " + baseName);
                    content.push({
                        title: baseName.substring(baseName.indexOf('.') + 2),
                        data: converter.makeHtml(fs.readFileSync(fullPath, 'UTF-8'))
                    });
                });


                const assetsFolder = path.join(bookFolder, '_assets');
                const coverPath = path.join(assetsFolder, 'cover.jpg');
                const scssPath = path.join(assetsFolder, 'book.scss');
                const tempScssPath = path.join(assetsFolder, 'temp.scss');
                const fontsPath = path.join(assetsFolder, 'fonts');

                progressCallback("Parsing fonts");
                const fonts = [];
                const sassPromises = [];


                fs.readdirSync(fontsPath).forEach((font) => {
                    const fontPath = path.join(fontsPath, font);
                    fs.readdirSync(fontPath).forEach((file) => {
                        if (file.endsWith('.ttf')) {
                            fonts.push(path.join(fontPath, file));
                        } else if (file.endsWith('.scss')) {
                            sassPromises.push(new Promise((resolve) => {
                                fs.readFile(path.join(fontPath, file), 'UTF-8', (err, contents) => {
                                    if (err)
                                        console.log(err);
                                    resolve(contents.replace(/\.\.\/fonts\/.*\//g, './fonts/'));
                                });
                            }));
                        }
                    });
                });

                progressCallback('Generating styles');
                Promise.all(sassPromises).then((fontStyles) => {
                    fs.readFile(scssPath, 'UTF-8', (err, contents) => {
                        if (err)
                            console.log(err);
                        fs.writeFile(tempScssPath, fontStyles.join('') 
                                + fs.readFileSync(path.join(path.join(__dirname, 'scss'), 'book.scss'), 'UTF-8') 
                                + contents, 'UTF-8', (err) => {
                            if (err)
                                console.log(err);
                            compile.Sass.options({
                                style: compile.Sass.style.compressed
                            }, () => {
                                compile(tempScssPath, (css) => {
                                    if (css.status !== 0) {
                                        progressCallback('Errors generating styles');
                                        resolve(false);
                                        return;
                                    }
                                    fs.unlink(tempScssPath, () => {
                                    });
                                    progressCallback("Building ePub");
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
                                        fonts,
                                        css: css.text,
                                        author: '',
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
                        });
                    });
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
    getBookStyle: (book) => {
        return new Promise((resolve) => {
            fs.readFile(path.join(path.join(path.join(neogut.basePath, book), '_assets'), 'book.scss'), 'UTF-8', (err, contents) => {
                if (err)
                    console.log(err);
                resolve(contents);
            });
        });
    },
    saveChapter: (book, chapter, contents) => {
        return new Promise((resolve) => {

            if (chapter === null || chapter.length === 0) {
                fs.writeFile(path.join(path.join(path.join(neogut.basePath, book), '_assets'), 'book.scss'), contents, 'UTF-8', (err) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(null);
                    }
                });
            } else {
                fs.writeFile(path.join(path.join(neogut.basePath, book), chapter), contents, 'UTF-8', (err) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(null);
                    }
                });
            }
        });
    },
    createBook: (book) => {
        return new Promise((resolve) => {
            const bookPath = path.join(neogut.basePath, book);
            if (!fs.existsSync(bookPath)) {
                fs.mkdirSync(bookPath);
                const assetsPath = path.join(bookPath, '_assets');
                fs.mkdirSync(assetsPath);
                fs.mkdirSync(path.join(assetsPath, 'fonts'));
                fs.mkdirSync(path.join(assetsPath, 'images'));
                fs.writeFile(path.join(assetsPath, 'book.scss'),
                        `/*
STYLES:
    This is the book's stylesheet, in here you may use either CSS or
    SCSS (http://sass-lang.com/guide) to apply custom styles to your generated
    books.      

FONTS: 
    To apply an included font, simply apply the font name property on any
    element. For convenience, some includable classes are also available which
    will apply the font to the element and all its descendants.
        *  font-name: "Montserrat"; OR @include .ff-montserrat;
        *  font-name: "Open Sans"; OR @include .ff-open-sans;
        *  font-name: "Quicksand"; OR @include .ff-quicksand;
        *  font-name: "Raleway"; OR @include .ff-raleway;
        *  font-name: "Roboto"; OR @include .ff-roboto;

        *  font-name: "Abril Fatface"; OR @include .ff-abril-fatface;
        *  font-name: "Alfa Slab"; OR @include .ff-alfa-slab;
        *  font-name: "Droid Serif"; OR @include .ff-droid-serif;
        *  font-name: "Libre Baskerville"; OR @include .ff-libre-baskerville;
        *  font-name: "Playfair Display"; OR @include .ff-playfair-display;

        *  font-name: "Comic Relief"; OR @include .ff-comic-relief;
        *  font-name: "Delius Swash Caps"; OR @include .ff-delius-swash-caps;
        *  font-name: "Kalam"; OR @include .ff-kalam;

        *  font-name: "1942 Report"; OR @include .ff-1942-report;
        *  font-name: "Special Elite"; OR @include .ff-special-elite;
        *  font-name: "Underwood Champion"; OR @include .ff-underwood-champion;
*/`, 'UTF-8', () => {
                    resolve(true);
                });
            } else {
                resolve(false);
            }
        });
    },
    deleteBook: (book) => {
        return new Promise((resolve) => {
            const bookPath = path.join(neogut.basePath, book);
            fs.emptyDir(bookPath).then(() => {
                fs.rmdir(bookPath).then(resolve);
            });
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
    deleteChapter: (book, chapter) => {
        return new Promise((resolve) => {
            fs.unlink(path.join(path.join(neogut.basePath, book), chapter)).then(resolve);
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
            const fontPath = path.join(path.join(path.join(path.join(neogut.basePath, book), '_assets'), 'fonts'), font);
            fs.emptyDir(fontPath).then(() => {
                fs.rmdir(fontPath).then(resolve);
            });
        });
    },
    moveAfter: (book, after, toMove) => {
        return new Promise((resolve) => {
            const bookPath = path.join(neogut.basePath, book);
            const afterNumber = Number.parseInt(after.substring(0, after.indexOf('.')));
            const movedNumber = Number.parseInt(toMove.substring(0, toMove.indexOf('.')));

            fs.readdir(bookPath, (err, files) => {
                const toAugment = [];
                files.forEach((file) => {
                    if (!fs.lstatSync(path.join(bookPath, file)).isDirectory() && !path.basename(file).startsWith('_')) {
                        const chapterNumber = Number.parseInt(file.substring(0, file.indexOf('.')));
                        if (chapterNumber > afterNumber) {
                            toAugment.push({
                                name: file,
                                number: chapterNumber,
                                base: file.substring(file.indexOf('0') + 2)
                            });
                        }
                    }
                });
                const tightenChapters = () => {
                    fs.readdir(bookPath, (err, files) => {

                        let chapters = [];
                        files.forEach((file) => {
                            if (!fs.lstatSync(path.join(bookPath, file)).isDirectory() && !path.basename(file).startsWith('_')) {
                                chapters.push(file);
                            }
                        });
                        chapters = _.sortBy(chapters, (chapter) => {
                            return Number.parseInt(chapter.substring(0, chapter.indexOf('.')));
                        });

                        const promises = [];
                        for (let i = 0; i < chapters.length; i++) {
                            promises.push(new Promise((resolve) => {
                                const currentName = chapters[i];
                                const newName = (i + 1) + '. ' + currentName.substring(currentName.indexOf('.') + 2);
                                if (currentName !== newName) {
                                    fs.rename(path.join(bookPath, currentName), path.join(bookPath, newName), resolve);
                                } else {
                                    resolve();
                                }
                            }));
                        }
                        Promise.all(promises).then(resolve);
                    });
                };
                const processSingleAugmentation = () => {
                    if (toAugment.length > 0) {
                        const currentChapter = toAugment.pop();
                        fs.rename(path.join(bookPath, currentChapter.name), path.join(bookPath, (currentChapter.number + 1) + currentChapter.base), (err) => {
                            processSingleAugmentation();
                        });
                    } else {
                        fs.rename(path.join(bookPath, toMove), path.join(bookPath, (afterNumber + 1) + toMove.substring(toMove.indexOf('0') + 2)), (err) => {
                            tightenChapters();
                        });
                    }
                };
                processSingleAugmentation();


            });
        });




    },
    setCover: (book) => {
        return new Promise((resolve) => {
            const coverPath = dialog.showOpenDialog({
                title: 'Select new book cover',
                properties: ['openFile'],
                filters: {
                    filters: [
                        {name: 'Images', extensions: ['jpg', 'png', 'gif']}
                    ]
                }
            });
            if (coverPath && coverPath.length > 0) {
                fs.copy(coverPath[0], path.join(path.join(path.join(neogut.basePath, book), '_assets'), 'cover.jpg')).then(resolve);
            } else {
                resolve()
            }
        });
    },
    deleteCover: (book) => {
        return new Promise((resolve) => {
            fs.unlink(path.join(path.join(path.join(neogut.basePath, book), '_assets'), 'cover.jpg'), resolve);
        });
    },
    getCover: (book) => {
        return new Promise((resolve) => {
            const coverPath = path.join(path.join(path.join(neogut.basePath, book), '_assets'), 'cover.jpg');

            if (fs.existsSync(coverPath)) {
                resolve(Buffer(fs.readFileSync(coverPath)).toString('base64'));
            } else {
                resolve(false);
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
exports.createBook = neogut.createBook;
exports.createChapter = neogut.createChapter;
exports.addFont = neogut.addFont;
exports.removeFont = neogut.removeFont;
exports.getBookFonts = neogut.getBookFonts;
exports.deleteBook = neogut.deleteBook;
exports.deleteChapter = neogut.deleteChapter;
exports.getBookStyle = neogut.getBookStyle;
exports.moveAfter = neogut.moveAfter;
exports.setCover = neogut.setCover;
exports.deleteCover = neogut.deleteCover;
exports.getCover = neogut.getCover;





exports.openDevTool = () => {
    neogut.mainWindow.webContents.openDevTools({mode: 'detach'});
};