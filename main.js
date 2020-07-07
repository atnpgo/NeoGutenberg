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

/* global */


const electron = require('electron');
const app = electron.app;
const dialog = electron.dialog;
const BrowserWindow = electron.BrowserWindow;
const fs = require('fs-extra');
const path = require('path');
const url = require('url');
const Epub = require('epub-gen');
const kindlegen = require('kindlegen');
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
                'title-bar-style': 'hidden',
                webPreferences: {
                    nodeIntegration: true
                }
            });
            neogut.mainWindow.maximize();
            neogut.mainWindow.setMenu(null);
            neogut.mainWindow.loadURL(url.format({
                pathname: path.join(__dirname, 'index.html'),
                protocol: 'file:',
                slashes: true
            }));
            neogut.mainWindow.on('closed', () => neogut.mainWindow = null);
        };
        if (!fs.existsSync(neogut.basePath)) {
            fs.mkdirSync(neogut.basePath);
            const book = 'Guide';
            const chapter = '1. Quick Reference';
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
                    
You may point images to external hosts, drag and drop image files here or paste images directly in the editor window.

![alt text](https://atnpgo.wtf/NeoGutenberg/logo/logo.svg)

# Tables

Colons can be used to align columns.

| Tables        | Are           | Cool  |
| ------------- |:-------------:| -----:|
| col 3 is      | right-aligned | $1600 |
| col 2 is      | centered      |   $12 |
| zebras        | are neat      |    $1 |

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
    generateBook: (book, authorName, progressCallback) => new Promise(resolve => {
        const bookFolder = path.join(neogut.basePath, book);
        fs.readdir(bookFolder, (err, files) => {
            progressCallback('Building content');

            const content = _.sortBy(
                files.filter(f => !fs.lstatSync(path.join(bookFolder, f)).isDirectory() && !path.basename(f).startsWith('_')),
                c => Number.parseInt(c.substring(0, c.indexOf('.')))
            ).map(f => {
                const baseName = path.basename(f, '.md');
                progressCallback('Building Chapter ' + baseName);
                return {
                    title: baseName.substring(baseName.indexOf('.') + 2),
                    data: converter.makeHtml(fs.readFileSync(path.join(bookFolder, f), 'UTF-8'))
                };
            });


            const assetsFolder = path.join(bookFolder, '_assets');
            const coverPath = path.join(assetsFolder, 'cover.jpg');
            const scssPath = path.join(assetsFolder, 'book.scss');
            const tempScssPath = path.join(assetsFolder, 'temp.scss');
            const fontsPath = path.join(assetsFolder, 'fonts');

            progressCallback('Parsing fonts');
            const fonts = [];
            const sassPromises = [];


            fs.readdirSync(fontsPath).forEach(font => {
                const fontPath = path.join(fontsPath, font);
                fs.readdirSync(fontPath).forEach(file => {
                    if (file.endsWith('.ttf')) {
                        fonts.push(path.join(fontPath, file));
                    } else if (file.endsWith('.scss')) {
                        sassPromises.push(new Promise(resolve => fs.readFile(path.join(fontPath, file), 'UTF-8', (err, contents) => {
                            if (err) {
                                // eslint-disable-next-line no-console
                                console.log(err);
                            }
                            resolve(contents.replace(/\.\.\/fonts\/.*\//g, './fonts/'));
                        })));
                    }
                });
            });

            progressCallback('Generating styles');
            Promise.all(sassPromises).then(fontStyles => fs.readFile(scssPath, 'UTF-8', (err, contents) => {
                if (err) {
                    // eslint-disable-next-line no-console
                    console.log(err);
                }
                const scss = fontStyles.join('') + fs.readFileSync(path.join(__dirname, 'scss', 'book.scss'), 'UTF-8') + contents;
                compile.Sass.options({style: compile.Sass.style.compressed}, () => compile.Sass.compile(scss, css => {
                    if (css.status !== 0) {
                        progressCallback('Errors generating styles');
                        // eslint-disable-next-line no-console
                        console.log(css);
                        resolve(false);
                        return;
                    }
                    fs.unlink(tempScssPath);
                    progressCallback('Building ePub');
                    const outPath = dialog.showOpenDialog({
                        title: 'Select output folder',
                        properties: ['openDirectory', 'createDirectory']
                    });
                    if (outPath && outPath.length > 0) {
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

                        new Epub(options).promise.then(() => {
                            progressCallback('Building mobi');
                            kindlegen(fs.readFileSync(epubPath), (error, mobi) => fs.writeFile(mobiPath, mobi, err => {
                                if (err) {
                                    progressCallback(err);
                                    resolve(false);
                                } else {
                                    progressCallback('Ebooks Generated Successfully!');
                                    resolve(true);
                                }
                            }));
                        }, err => {
                            progressCallback('Failed to generate epub because of ' + err);
                            resolve(false);
                        });
                    } else {
                        resolve(false);
                    }

                }));
            }));
        }, bookFolder);
    }),
    listBooks: () => new Promise(resolve => fs.readdir(neogut.basePath, (err, files) => resolve(files))),
    listChapters: book => new Promise(r => {
        const bookPath = path.join(neogut.basePath, book);
        fs.readdir(bookPath, (err, files) => r(files.filter(f => {
            const chapterPath = path.join(bookPath, f);
            return !fs.lstatSync(chapterPath).isDirectory() && !path.basename(chapterPath).startsWith('_');
        })));
    }),
    getChapter: (book, chapter) => new Promise(r => fs.readFile(path.join(neogut.basePath, book, chapter), 'UTF-8', (err, contents) => r(contents))),
    getBookStyle: book => new Promise(r => fs.readFile(path.join(neogut.basePath, book, '_assets', 'book.scss'), 'UTF-8', (err, contents) => r(contents))),
    saveChapter: (book, ch, con) => new Promise(r => fs.writeFile(
        (ch === null || ch.length === 0) ?
            path.join(neogut.basePath, book, '_assets', 'book.scss') :
            path.join(neogut.basePath, book, ch),
        con, 'UTF-8', r)
    ),
    createBook: book => new Promise(r => {
        const bookPath = path.join(neogut.basePath, book);
        if (fs.existsSync(bookPath)) {
            r(false);
            return;
        }
        fs.mkdirSync(bookPath);
        const assetsPath = path.join(bookPath, '_assets');
        fs.mkdirSync(assetsPath);
        fs.mkdirSync(path.join(assetsPath, 'fonts'));
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
*/`, 'UTF-8', () => r(true));
    }),
    deleteBook: book => new Promise(r => {
        const bookPath = path.join(neogut.basePath, book);
        fs.emptyDir(bookPath).then(() => fs.rmdir(bookPath).then(r));
    }),
    createChapter: (book, chapter) => new Promise(resolve => {
        if (!fs.existsSync(path.join(neogut.basePath, book, chapter))) {
            neogut.saveChapter(book, chapter + '.md', '# ' + chapter.substring(chapter.indexOf('.') + 2) + '\n\n');
            resolve(true);
        } else {
            resolve(false);
        }
    }),
    deleteChapter: (book, chapter) => new Promise(r => fs.unlink(path.join(neogut.basePath, book, chapter)).then(r)),
    getBookFonts: book => new Promise(resolve => {
        const fontsPath = path.join(neogut.basePath, book, '_assets', 'fonts');
        fs.readdir(fontsPath, (err, files) => resolve(files.filter(f => {
            const chapterPath = path.join(fontsPath, f);
            return fs.lstatSync(chapterPath).isDirectory() && !path.basename(chapterPath).startsWith('_');
        })));
    }),
    addFont: (book, font) => new Promise(resolve => {
        const output = path.join(neogut.basePath, book, '_assets', 'fonts', font);
        if (!fs.existsSync(output)) {
            fs.mkdirSync(output);
        }
        fs.copy(path.join(__dirname, 'fonts', font), output).then(resolve);
    }),
    removeFont: (book, font) => new Promise(resolve => {
        const fontPath = path.join(neogut.basePath, book, '_assets', 'fonts', font);
        fs.emptyDir(fontPath).then(() => fs.rmdir(fontPath).then(resolve));
    }),
    moveAfter: (book, after, toMove) => new Promise(resolve => {
        const bookPath = path.join(neogut.basePath, book);
        const afterNumber = Number.parseInt(after.substring(0, after.indexOf('.')));

        fs.readdir(bookPath, (err, files) => {
            const toAugment = files
                .map(f => ({
                    name: f,
                    number: Number.parseInt(f.substring(0, f.indexOf('.'))),
                    base: f.substring(f.indexOf('0') + 2)
                }))
                .filter(f =>
                    !fs.lstatSync(path.join(bookPath, f.name)).isDirectory()
                    && !path.basename(f.name).startsWith('_')
                    && f.number > afterNumber
                )
            ;


            const processSingleAugmentation = () => {
                if (toAugment.length > 0) {
                    const currentChapter = toAugment.pop();
                    fs.rename(path.join(bookPath, currentChapter.name), path.join(bookPath, (currentChapter.number + 1) + currentChapter.base), processSingleAugmentation);
                } else {
                    fs.rename(
                        path.join(bookPath, toMove),
                        path.join(bookPath, (afterNumber + 1) + toMove.substring(toMove.indexOf('0') + 2)),
                        // callback
                        () => fs.readdir(bookPath, (err, files) =>
                            Promise.all(
                                _.sortBy(
                                    files.filter(file => !fs.lstatSync(path.join(bookPath, file)).isDirectory() && !path.basename(file).startsWith('_')),
                                    chapter => Number.parseInt(chapter.substring(0, chapter.indexOf('.')))
                                ).map((c, i) => new Promise(resolve => {
                                    const newName = (i + 1) + '. ' + c.substring(c.indexOf('.') + 2);
                                    if (c !== newName) {
                                        fs.rename(path.join(bookPath, c), path.join(bookPath, newName), resolve);
                                    } else {
                                        resolve();
                                    }
                                }))
                            ).then(resolve)));
                }
            };
            processSingleAugmentation();
        });
    }),
    setCover: book => new Promise(resolve => {
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
            fs.copy(coverPath[0], path.join(neogut.basePath, book, '_assets', 'cover.jpg')).then(resolve);
        } else {
            resolve();
        }
    }),
    deleteCover: book => new Promise(r => fs.unlink(path.join(neogut.basePath, book, '_assets', 'cover.jpg'), r)),
    getCover: book => new Promise(resolve => {
        const coverPath = path.join(neogut.basePath, book, '_assets', 'cover.jpg');
        if (fs.existsSync(coverPath)) {
            resolve(Buffer(fs.readFileSync(coverPath)).toString('base64'));
        } else {
            resolve(false);
        }
    }),
    renameBook: (book, newName) => new Promise(r => fs.rename(path.join(neogut.basePath, book), path.join(neogut.basePath, newName), r)),
    renameChapter: (book, chapter, newName) => new Promise(resolve => {
        const bookPath = path.join(neogut.basePath, book);
        fs.rename(path.join(bookPath, chapter), chapter.substring(chapter.indexOf('.')) + '. ' + path.join(bookPath, newName) + '.md', resolve);
    })
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
    if (neogut.mainWindow === null) {
        neogut.createWindow();
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
exports.renameBook = neogut.renameBook;
exports.renameChapter = neogut.renameChapter;


exports.openDevTool = () => {
    //neogut.mainWindow.webContents.openDevTools({mode: 'detach'});
};
