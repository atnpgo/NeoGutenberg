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


/* global Promise, ace, smalltalk */

const remote = require('electron').remote;
const mainProcess = remote.require('./main.js');

$(document).ready(() => {
    $('[data-toggle="tooltip"]').tooltip();
    neogut.bindAllBooks().then(neogut.bindGlobalEvents);
});

/**
 * App namespace
 * @type neogut
 */
window.neogut = {
    /**
     * The list of opened files.
     * @type Array
     */
    openedFiles: [],
    /**
     * The showdown converter used for html previews.
     * @type showdown.Converter
     */
    showdown: new showdown.Converter({
        strikethrough: true,
        tables: true
    }),
    /**
     * Instance of the ace editor, if instanciated.
     * @type Ace.Editor
     */
    editor: null,
    /**
     * Loads an external template, passing it to the callback function.
     * @param {array|string} path The name/path to the template, can ommit leading "template/" and trailing ".html"
     * @returns {Promise} A future resolved once the templates have been loaded and compiled. The value passed is an array 
     * of Handlebars templates, even if a single string was passed.
     */
    loadExtTemplate: (path) => {
        const loadSingleTemplate = (p, callback) => {
            if (!p.startsWith('templates/')) {
                p = 'templates/' + p;
            }

            if (!p.endsWith(".html")) {
                p += ".html";
            }
            const scriptId = p.replace(/\./g, "-").replace(/\//g, "-");
            if ($('#' + scriptId).length > 0) {
                callback($('#' + scriptId).html());
                return;
            }
            $.get({
                url: p,
                success: (templateData) => {
                    const script = document.createElement("script");
                    script.id = scriptId;
                    script.innerHTML = templateData;
                    script.type = "text/x-handlebars-template";
                    document.head.appendChild(script);
                    callback(templateData);
                }
            });
        };
        const promises = [];

        if (_.isString(path)) {
            promises.push(new Promise((resolve) => {
                loadSingleTemplate(path, (template) => {
                    resolve(Handlebars.compile(template));
                });
            }));
        } else if (_.isArray(path)) {
            path.forEach((p) => {
                promises.push(new Promise((resolve) => {
                    loadSingleTemplate(p, (template) => {
                        resolve(Handlebars.compile(template));
                    });
                }));
            });
        }
        return Promise.all(promises);
    },
    /**
     * Pulls the template for, instanciates and returns an instace of the named modal.
     * @param {type} data The data to bind to the modal.
     * @returns {Promise} A future resolved once ready, the value passed is the modal instance.
     */
    getModal: (data) => {
        return new Promise((resolve) => {
            neogut.loadExtTemplate('modal').then((templates) => {
                $('body').append(templates[0](data));
                resolve($('.modal').modal({
                    backdrop: 'static'
                }).on('hidden.bs.modal', () => {
                    $('.modal').remove();
                }));
            });
        });
    },
    /**
     * Pulls the list of books and binds them to the UI.
     * @returns {Promise} A future revolced once the books have been bound. Does not call bind events.
     */
    bindAllBooks: () => {
        return new Promise((resolve) => {
            neogut.loadExtTemplate(['book']).then((templates) => {
                const promises = [];
                mainProcess.listBooks().then((books) => {
                    books.forEach((book) => {
                        promises.push(new Promise((resolve) => {
                            mainProcess.listChapters(book).then((chapters) => {
                                resolve({
                                    book,
                                    chapters
                                });
                            });
                        }));
                    });
                    const $sidebar = $('.sidebar').empty();
                    Promise.all(promises).then((values) => {
                        values.forEach((value) => {
                            value.chapters = _.sortBy(value.chapters, (chapter) => {
                                return Number.parseInt(chapter.substring(0, chapter.indexOf('.')));
                            });
                            $sidebar.append(templates[0](value));
                        });
                        resolve();
                    });
                });

            });
        });
    },
    /**
     * Returns the opened chapter from the list, null if the chapter isn't opened.
     * @param {string} book The name of the book
     * @param {string} chapter The name of the chapter
     * @returns {Object|null} The book or null.
     */
    getOpenedChapter: (book, chapter) => {
        if (!_.isNull(chapter) && (_.isUndefined(chapter) || chapter.length === 0)) {
            chapter = null;
        }
        for (let i = 0; i < neogut.openedFiles.length; i++) {
            if (neogut.openedFiles[i].book === book && neogut.openedFiles[i].chapter === chapter) {
                return neogut.openedFiles[i];
            }
        }
        return null;
    },
    /**
     * Returns the index of the opened chapter from the list.
     * @param {string} book The name of the book
     * @param {string} chapter The name of the chapter
     * @returns {number} The book index.
     */
    getOpenedChapterIndex: (book, chapter) => {
        if (!_.isNull(chapter) && (_.isUndefined(chapter) || chapter.length === 0)) {
            chapter = null;
        }
        let i = 0;
        for (; i < neogut.openedFiles.length; i++) {
            if (neogut.openedFiles[i].book === book && neogut.openedFiles[i].chapter === chapter) {
                break;
            }
        }
        return i;
    },
    /**
     * Opens the specified chapter 
     * @param {string} book The name of the book.
     * @param {string} chapter The title of the chapter
     * @returns {Promise} A future resolved once the chapter is opened.
     */
    openChapter: (book, chapter) => {
        if (neogut.getOpenedChapter(book, chapter) === null) {
            neogut.openedFiles.push({book, chapter});
            return new Promise((resolve) => {
                neogut.loadExtTemplate('tab').then((templates) => {
                    $('.tab-group').append(templates[0]({book, chapter}));
                    neogut.bindBookEvents();
                    neogut.showChapterEditor(book, chapter).then(resolve);
                });
            });
        } else {
            return new Promise((resolve) => {
                neogut.showChapterEditor(book, chapter).then(resolve);
            });
        }
    },
    /**
     * Closes the specified chapter 
     * @param {string} book The name of the book.
     * @param {string} chapter The title of the chapter
     * @returns {Promise} A future resolved once the chapter is closed.
     */
    closeChapter: (book, chapter) => {
        return new Promise((resolve) => {
            const close = () => {
                let prev = null;
                for (let i = 0; i < neogut.openedFiles.length; i++) {
                    if (neogut.openedFiles[i].book === book && neogut.openedFiles[i].chapter === (chapter === '' ? null : chapter)) {
                        neogut.openedFiles.splice(i, 1);
                        break;
                    }
                    prev = neogut.openedFiles[i];
                }
                if (chapter === null) {
                    chapter = '';
                }
                $('.tab-item[data-book="' + book + '"][data-chapter="' + chapter + '"]').remove();

                if (neogut.openedFiles.length > 0) {
                    if (prev === null) {
                        prev = neogut.openedFiles[0];
                    }
                    neogut.showChapterEditor(prev.book, prev.chapter).then(resolve);
                } else {
                    neogut.editor = null;
                    $('#editor-container').empty();
                    resolve();
                }
            };
            if ($('.tab-item[data-book="' + book + '"][data-chapter="' + chapter + '"]').hasClass('has-changes')) {
                smalltalk.confirm('You have unasved changes',
                        'Are you sure you want to close ' + book + ' - ' + chapter + '? If you click OK, any unsaved changes will be lost').then(() => {
                    close();
                }, () => {
                    resolve();
                });
            } else {
                close();
            }
        });
    },
    /**
     * Saves the specified chapter 
     * @param {string} book The name of the book.
     * @param {string} chapter The title of the chapter
     * @returns {Promise} A future resolved once the chapter is saved.
     */
    saveChapter: (book, chapter) => {
        if (neogut.editor) {
            neogut.editor.off('input');
            neogut.editor.on('input', () => {
                $('#html-preview').html(neogut.showdown.makeHtml(neogut.editor.getValue()));
            });
            return new Promise((resolve) => {
                mainProcess.saveChapter(book, chapter, neogut.getOpenedChapter(book, chapter).markdown).then((err) => {
                    if (err) {
                        console.error(err);
                    }
                    $('.tab-item[data-book="' + book + '"][data-chapter="' + chapter + '"]').removeClass('has-changes');
                    resolve();
                });
            });
        } else {
            return Promise.resolve();
        }
    },
    /**
     * Opens the displays without opening the chapter editor.
     * @param {string} book The name of the book.
     * @param {string} chapter The title of the chapter
     * @returns {Promise} A future resolved once the chapter editor is shown.
     */
    showChapterEditor: (book, chapter) => {
        if (chapter === null || chapter === '') {
            return neogut.showBookStyleEditor(book);
        }

        return new Promise((resolve) => {
            $('.tab-item.active').removeClass('active');
            $('.tab-item[data-book="' + book + '"][data-chapter="' + chapter + '"]').addClass('active');

            $('.nav-group-title.active').removeClass('active');
            $('.nav-group-title[data-book="' + book + '"]').addClass('active');

            const $editorContainer = $('#editor-container').empty(), opened = neogut.getOpenedChapter(book, chapter);
            neogut.loadExtTemplate('editor').then((templates) => {
                $editorContainer.append(templates[0]());

                const process = (contents) => {
                    $('#html-preview').html(neogut.showdown.makeHtml(contents));

                    neogut.editor = ace.edit("md-editor");
                    neogut.editor.$blockScrolling = Infinity;

                    if (localStorage.getItem('editor-theme')) {
                        neogut.editor.setTheme(localStorage.getItem('editor-theme'));
                    }
                    var MdMode = ace.require("ace/mode/markdown").Mode;
                    neogut.editor.session.setMode(new MdMode());
                    neogut.editor.setValue(contents, -1);
                    neogut.getOpenedChapter(book, chapter).markdown = contents;
                    neogut.bindBookEvents();
                    resolve();
                };

                if (opened && opened.markdown) {
                    process(opened.markdown);
                } else {
                    mainProcess.getChapter(book, chapter).then(process);
                }

            });

        });
    },
    /**
     * Opens the specified book's style sheet.
     * @param {string} book The name of the book.
     * @returns {Promise} A future resolved once the book styles are opened.
     */
    openBookStyle: (book) => {
        if (neogut.getOpenedChapter(book, null) === null) {
            neogut.openedFiles.push({book, chapter: null});
            return new Promise((resolve) => {
                neogut.loadExtTemplate('tab').then((templates) => {
                    $('.tab-group').append(templates[0]({book, chapter: null}));
                    neogut.bindBookEvents();
                    neogut.showBookStyleEditor(book).then(resolve);
                });
            });
        } else {
            return new Promise((resolve) => {
                neogut.showBookStyleEditor(book).then(resolve);
            });
        }
    },
    showBookStyleEditor: (book) => {
        return new Promise((resolve) => {
            $('.tab-item.active').removeClass('active');
            $('.tab-item[data-book="' + book + '"][data-chapter=""]').addClass('active');

            $('.nav-group-title.active').removeClass('active');
            $('.nav-group-title[data-book="' + book + '"]').addClass('active');

            const $editorContainer = $('#editor-container').empty(), opened = neogut.getOpenedChapter(book, null);
            neogut.loadExtTemplate('editor').then((templates) => {
                $editorContainer.append(templates[0]());

                const process = (contents) => {
                    $('#html-preview').parent().hide();//.html(neogut.showdown.makeHtml(contents));
                    $('#md-editor').parent().css('width', '100%');
                    neogut.editor = ace.edit("md-editor");
                    neogut.editor.$blockScrolling = Infinity;

                    if (localStorage.getItem('editor-theme')) {
                        neogut.editor.setTheme(localStorage.getItem('editor-theme'));
                    }
                    var scssMode = ace.require("ace/mode/scss").Mode;
                    neogut.editor.session.setMode(new scssMode());
                    neogut.editor.setValue(contents, -1);
                    neogut.getOpenedChapter(book, null).markdown = contents;
                    neogut.bindBookEvents();
                    resolve();
                };

                if (opened && opened.markdown) {
                    process(opened.markdown);
                } else {
                    mainProcess.getBookStyle(book).then(process);
                }

            });

        });
    },
    /**
     * Binds the global event, the ones that last for the duration of the application. Then calls bindBookEvents.
     * @returns {undefined}
     */
    bindGlobalEvents: () => {
        $(document).keydown((e) => {
            if (e.ctrlKey) {
                const $tab = $('.tab-item.active'), book = $tab.data('book'), chapter = $tab.data('chapter');
                switch (e.which) {
                    case 87 /* W */ :
                        if (e.shiftKey) {
                            const closeSingle = () => {
                                if (neogut.openedFiles[0]) {
                                    neogut.closeChapter(neogut.openedFiles[0].book, neogut.openedFiles[0].chapter).then(closeSingle);
                                }
                            };
                            closeSingle();
                        } else {
                            neogut.closeChapter(book, chapter);
                        }
                        break;
                    case 83 /* S */ :
                        if (e.shiftKey) {
                            neogut.openedFiles.forEach((file) => {
                                neogut.saveChapter(file.book, file.chapter);
                            });
                        } else {
                            neogut.saveChapter(book, chapter);
                        }
                        break;
                    case 9 /* TAB */:
                        let index = neogut.getOpenedChapterIndex(book, chapter);
                        if (e.shiftKey) {
                            index--;
                            if (index < 0)
                                index = neogut.openedFiles.length - 1;
                        } else {
                            index++;
                            if (index > neogut.openedFiles.length - 1)
                                index = 0;
                        }
                        neogut.showChapterEditor(neogut.openedFiles[index].book, neogut.openedFiles[index].chapter);
                        break;
                    case 73 /* I */ :
                        if (e.shiftKey) {
                            mainProcess.openDevTool();
                        }
                        break;
                }
            }
        });
        $('#btn-create-book').off('click').on('click', () => {
            smalltalk.prompt('Create book', 'Please enter the title of the book.').then((value) => {
                if (value && value.trim().length > 0) {
                    mainProcess.createBook(value.trim()).then(neogut.bindAllBooks).then(neogut.bindBookEvents);
                }
            });
        });
        $('#btn-create-chapter').off('click').on('click', () => {
            const active = $('.nav-group-title.active');
            if (active.length > 0) {
                smalltalk.prompt('Create chapter', 'Please enter the title of the chapter.').then((value) => {
                    if (value && value.trim().length > 0) {
                        const newChapter = active.parent().find('.chapter').length + 1;
                        mainProcess.createChapter(active.data('book'), newChapter + '. ' + value.trim()).then(neogut.bindAllBooks).then(neogut.bindBookEvents);
                    }
                });
            } else {
                smalltalk.alert('Please select a book.', 'You may select a book by clicking its name in the sidebar.');
            }
        });
        $('#btn-generate-ebooks').off('click').on('click', () => {
            const active = $('.nav-group-title.active');
            if (active.length > 0) {
                mainProcess.generateBook(active.data('book'), localStorage.getItem('author-name'), (progress) => {
                    $('.toolbar-footer > .title').text(progress);
                }).then((state) => {
                    if (state) {
                        smalltalk.alert('Success', 'The ebooks were generated successfully.');
                    } else {
                        smalltalk.alert('Failure', 'The ebooks were not generated successfully.');
                    }
                });
            } else {
                smalltalk.alert('Please select a book.', 'You may select a book by clicking its name in the sidebar.');
            }
        });
        $('#btn-open-settings').off('click').on('click', () => {
            neogut.getModal({
                title: 'Settings'
            }).then(($modal) => {
                const modalBody = $modal.find('.modal-body');
                neogut.loadExtTemplate('settings').then((templates) => {
                    modalBody.html(templates[0]());
                    $('#settings-name').off('blur').on('blur', (e) => {
                        localStorage.setItem('author-name', $(e.currentTarget).val());
                    }).val(localStorage.getItem('author-name') ? localStorage.getItem('author-name') : '');
                    $('#settings-editor-theme').off('change').on('change', (e) => {
                        const newTheme = $(e.currentTarget).val();
                        localStorage.setItem('editor-theme', newTheme);
                        if (neogut.editor) {
                            neogut.editor.setTheme(newTheme);
                        }
                    }).val(localStorage.getItem('editor-theme') ? localStorage.getItem('editor-theme') : '');
                });

            });
        });

        document.addEventListener('paste', (e) => {
            if (e.clipboardData) {
                var items = e.clipboardData.items;
                if (!items)
                    return;

                //access data directly
                for (var i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") !== -1) {
                        //image
                        const blob = items[i].getAsFile();
                        const reader = new window.FileReader();
                        reader.onloadend = () => {
                            if (neogut.editor) {
                                neogut.editor.session.insert(neogut.editor.getCursorPosition(), '![pasted image](' + reader.result + ')');
                            }
                        }
                        reader.readAsDataURL(blob);
                    }
                }
                e.preventDefault();
            }


        }, false);
        
        $('body').on("dragover", (e) => {
            e.preventDefault();
            e.stopPropagation();
            $(e.currentTarget).addClass('dragging');
        }).on("dragleave", (e) => {
            e.preventDefault();
            e.stopPropagation();
            $(e.currentTarget).removeClass('dragging');
        }).on("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            // If dropped items aren't files, reject them
            var dt = e.originalEvent.dataTransfer;
            if (dt.items) {
                // Use DataTransferItemList interface to access the file(s)
                for (var i = 0; i < dt.items.length; i++) {
                    if (dt.items[i].kind === "file") {
                        const blob = dt.items[i].getAsFile();
                        const reader = new window.FileReader();
                        reader.onloadend = () => {
                            if (neogut.editor) {
                                neogut.editor.session.insert(neogut.editor.getCursorPosition(), '![pasted image](' + reader.result + ')');
                            }
                        }
                        reader.readAsDataURL(blob);
                    }
                }
            } else {
                // Use DataTransfer interface to access the file(s)
                for (var i = 0; i < dt.files.length; i++) {
                    const reader = new window.FileReader();
                    reader.onloadend = () => {
                        if (neogut.editor) {
                            neogut.editor.session.insert(neogut.editor.getCursorPosition(), '![pasted image](' + reader.result + ')');
                        }
                    }
                    reader.readAsDataURL(dt.files[i]);
                }
            }
        });


        neogut.bindBookEvents();
    },
    /**
     * Binds the book related events, rebound everytime books/chapters are added/removed.
     * @returns {undefined}
     */
    bindBookEvents: () => {
        $('.nav-group-title').off('click').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            $('.nav-group-title.active').removeClass('active');
            $(e.currentTarget).addClass('active');
        });
        $('.nav-group-title > .more').off('click').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const book = $(e.currentTarget).parent().data('book');
            neogut.getModal({
                title: book,
                data: [
                    {k: 'book', v: book}
                ]
            }).then(($modal) => {
                const modalBody = $modal.find('.modal-body');
                neogut.loadExtTemplate('book-settings').then((templates) => {
                    modalBody.html(templates[0]());
                    mainProcess.getCover(book).then((path) => {
                        if (path) {
                            modalBody.find('img').attr('src', 'data:image/png;base64,' + path);
                        }
                    });
                    $('#btn-style-book').off('click').on('click', (e) => {
                        e.preventDefault();
                        $modal.on('hidden.bs.modal', () => {
                            neogut.openBookStyle(book);
                        });
                        $modal.modal('hide');
                    });
                    $('#btn-set-cover').off('click').on('click', (e) => {
                        e.preventDefault();
                        mainProcess.setCover(book).then(() => {
                            mainProcess.getCover(book).then((path) => {
                                if (path) {
                                    modalBody.find('img').attr('src', 'data:image/png;base64,' + path);
                                }
                            });
                        });
                    });
                    $('#btn-delete-cover').off('click').on('click', (e) => {
                        e.preventDefault();
                        mainProcess.deleteCover(book).then(() => {
                            modalBody.find('img').attr('src', '');
                        });
                    });
                    $('#btn-rename-book').off('click').on('click', (e) => {
                        e.preventDefault();
                        smalltalk.prompt('Rename', 'Please enter the new book name', book).then((value) => {
                            if (value && value.trim().length > 0) {
                                mainProcess.renameBook(book, value).then((err) => {
                                    if (err) {
                                        console.log(err);
                                    }
                                    $modal.on('hidden.bs.modal', () => {
                                        neogut.bindAllBooks().then(neogut.bindBookEvents);
                                    });
                                    $modal.modal('hide');
                                });
                            }
                        });
                    });
                    $('#btn-delete-book').off('click').on('click', (e) => {
                        e.preventDefault();
                        smalltalk.confirm('Are you sure?', 'If you click ok, the book "' + book + '" will be deleted and unrecoverable.').then(() => {
                            mainProcess.deleteBook(book).then((res) => {
                                if (res)
                                    smalltalk.alert('Error', res);
                                $modal.on('hidden.bs.modal', () => {
                                    neogut.bindAllBooks().then(neogut.bindBookEvents);
                                });
                                $modal.modal('hide');
                            });
                        });
                    });
                    mainProcess.getBookFonts(book).then((fonts) => {
                        fonts.forEach((font) => {
                            modalBody.find('.checkbox.ff-' + font + ' input').attr('checked', true);
                        });
                        modalBody.find('.checkbox[class*="ff-"] > label > input[type="checkbox"]').off('change').on('change', (e) => {
                            const $this = $(e.currentTarget);
                            const font = $this.parents('.checkbox').attr('class').match(/ff-.*$/g)[0].substring(3);
                            if ($this.is(':checked')) {
                                mainProcess.addFont(book, font);
                            } else {
                                mainProcess.removeFont(book, font);
                            }
                        });
                    });
                });
            });
        });
        $('.chapter').off('click').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const $this = $(e.currentTarget), book = $this.data('book'), chapter = $this.data('chapter');
            neogut.openChapter(book, chapter);
        });
        $('.chapter > .more').off('click').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const $this = $(e.currentTarget).parent(), book = $this.data('book'), chapter = $this.data('chapter');
            neogut.getModal({
                title: book + ' - ' + chapter,
                data: [
                    {k: 'book', v: book},
                    {k: 'chapter', v: chapter}
                ]
            }).then(($modal) => {
                const modalBody = $modal.find('.modal-body');
                neogut.loadExtTemplate('chapter-settings').then((templates) => {
                    modalBody.html(templates[0]());
                    $('#btn-rename-chapter').off('click').on('click', (e) => {
                        e.preventDefault();
                        smalltalk.prompt('Rename', 'Please enter the new chapter name', chapter.substring(chapter.indexOf('.') + 2, chapter.length - 3)).then((value) => {
                            if (value && value.trim().length > 0) {
                                mainProcess.renameChapter(book, chapter, value).then(() => {
                                    $modal.on('hidden.bs.modal', (err) => {
                                        if (err) {
                                            console.log(err);
                                        }
                                        neogut.bindAllBooks().then(neogut.bindBookEvents);
                                    });
                                    $modal.modal('hide');
                                });
                            }
                        });
                    });
                    $('#btn-delete-chapter').off('click').on('click', (e) => {
                        e.preventDefault();
                        smalltalk.confirm('Are you sure?', 'If you click ok, the chapter "' + book + ' - ' + chapter + '" will be deleted and unrecoverable.').then(() => {
                            mainProcess.deleteChapter(book, chapter).then((res) => {
                                if (res)
                                    smalltalk.alert('Error', res);
                                $modal.on('hidden.bs.modal', () => {
                                    neogut.bindAllBooks().then(neogut.bindBookEvents);
                                });
                                $modal.modal('hide');
                            });
                        });
                    });
                });

            });
        });
        $('.tab-item').off('click').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const $this = $(e.currentTarget), book = $this.data('book'), chapter = $this.data('chapter');
            neogut.showChapterEditor(book, chapter);
        });
        $('.tab-item > .close').off('click').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const $parent = $(e.currentTarget).parent(), book = $parent.data('book'), chapter = $parent.data('chapter');
            neogut.closeChapter(book, chapter);
        });


        if (neogut.editor) {
            neogut.editor.off('input');
            neogut.editor.on('input', () => {
                if (neogut.editor) {
                    const markdown = neogut.editor.getValue();
                    $('#html-preview').html(neogut.showdown.makeHtml(markdown));
                    const $activeTab = $('.tab-item.active'), book = $activeTab.data('book'), chapter = $activeTab.data('chapter'),
                            opened = neogut.getOpenedChapter(book, chapter);

                    if (opened.markdown !== null && opened.markdown !== markdown) {
                        $activeTab.addClass('has-changes');
                    }
                    opened.markdown = markdown;
                }
            });
        }

        let source;
        $('.chapter').each((i, item) => {
            const $this = $(item), book = $this.data('book');
            $this.draggable({
                helper: 'clone',
                revert: "invalid",
                start: (e, ui) => {
                    source = $(e.target).css('opacity', '.5');
                },
                stop: (e, ui) => {
                    $(e.target).css('opacity', '1');
                }
            });
            $this.droppable({
                accept: '.chapter[data-book="' + book + '"]',
                drop: (e, ui) => {
                    mainProcess.moveAfter(book, $(e.target).data('chapter'), source.data('chapter')).then(neogut.bindAllBooks).then(neogut.bindBookEvents);
                }
            });
        });
    }
};