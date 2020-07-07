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


/* global ace smalltalk $ showdown Handlebars _ backend */

window.backend = require('electron').remote.require('./main.js');

$(document).ready(() => {
    $('[data-toggle="tooltip"]').tooltip();
    neogut.bindAllBooks().then(neogut.bindGlobalEvents);
});

/**
 * App namespace
 */
const neogut = {
    /**
     * The list of opened files.
     * @type Array
     */
    openedFiles: [],
    /**
     * The showdown converter used for html previews.
     */
    showdown: new showdown.Converter({
        strikethrough: true,
        tables: true
    }),
    /**
     * Instance of the ace editor, if instantiated.
     */
    editor: null,
    /**
     * Loads an external template, passing it to the callback function.
     * @param {array|string} path The name/path to the template, can ommit leading "template/" and trailing ".html"
     * @returns {Promise} A future resolved once the templates have been loaded and compiled. The value passed is an array
     * of Handlebars templates, even if a single string was passed.
     */
    loadExtTemplate: path => {
        const loadSingleTemplate = (p, callback) => {
            if (!p.startsWith('templates/')) {
                p = 'templates/' + p;
            }

            if (!p.endsWith('.html')) {
                p += '.html';
            }
            const scriptId = p.replace(/\./g, '-').replace(/\//g, '-');
            const template = $('#' + scriptId);
            if (template.length > 0) {
                callback(template.html());
                return;
            }
            $.get({
                url: p,
                success: templateData => {
                    const script = document.createElement('script');
                    script.id = scriptId;
                    script.innerHTML = templateData;
                    script.type = 'text/x-handlebars-template';
                    document.head.appendChild(script);
                    callback(templateData);
                }
            });
        };

        const map = p => new Promise(r => loadSingleTemplate(p, t => r(Handlebars.compile(t))));
        return Promise.all(_.isArray(path) ? path.map(map) : [map(path)]);
    },
    /**
     * Pulls the template for, instanciates and returns an instace of the named modal.
     * @param {type} data The data to bind to the modal.
     * @returns {Promise} A future resolved once ready, the value passed is the modal instance.
     */
    getModal: data => new Promise(r => neogut.loadExtTemplate('modal').then(templates => {
        $('body').append(templates[0](data));
        const $modal = $('.modal');
        r($modal.modal({backdrop: 'static'}).on('hidden.bs.modal', () => $modal.remove()));
    })),
    /**
     * Pulls the list of books and binds them to the UI.
     * @returns {Promise} A future revolced once the books have been bound. Does not call bind events.
     */
    bindAllBooks: () => new Promise(r => Promise.all([
        neogut.loadExtTemplate('book'),
        backend.listBooks()
    ]).then(data => Promise.all(data[1].map(book => new Promise(r => backend.listChapters(book).then(chapters => r({
        book,
        chapters
    }))))).then(values => r($('.sidebar').html(
        values
            .map(v => data[0][0](Object.assign(v, {chapters: _.sortBy(v.chapters, chapter => Number.parseInt(chapter.substring(0, chapter.indexOf('.'))))})))
            .join('')
    ))))),
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
            return new Promise(resolve => neogut.loadExtTemplate('tab').then(templates => {
                $('.tab-group').append(templates[0]({book, chapter}));
                neogut.bindBookEvents();
                neogut.showChapterEditor(book, chapter).then(resolve);
            }));
        } else {
            return new Promise(resolve => neogut.showChapterEditor(book, chapter).then(resolve));
        }
    },
    /**
     * Closes the specified chapter
     * @param {string} book The name of the book.
     * @param {string} chapter The title of the chapter
     * @returns {Promise} A future resolved once the chapter is closed.
     */
    closeChapter: (book, chapter) => new Promise(resolve => {
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
                'Are you sure you want to close ' + book + ' - ' + chapter + '? If you click OK, any unsaved changes will be lost'
            ).then(close, resolve);
        } else {
            close();
        }
    }),
    /**
     * Saves the specified chapter
     * @param {string} book The name of the book.
     * @param {string} chapter The title of the chapter
     * @returns {Promise} A future resolved once the chapter is saved.
     */
    saveChapter: (book, chapter) => {
        if (neogut.editor) {
            neogut.editor.off('input');
            neogut.editor.on('input', () => $('#html-preview').html(neogut.showdown.makeHtml(neogut.editor.getValue())));
            return new Promise(resolve => {
                backend.saveChapter(book, chapter, neogut.getOpenedChapter(book, chapter).markdown).then(err => {
                    if (err) {
                        // eslint-disable-next-line no-console
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

        return new Promise(resolve => {
            $('.tab-item.active').removeClass('active');
            $('.tab-item[data-book="' + book + '"][data-chapter="' + chapter + '"]').addClass('active');

            $('.nav-group-title.active').removeClass('active');
            $('.nav-group-title[data-book="' + book + '"]').addClass('active');

            const $editorContainer = $('#editor-container').empty();
            const opened = neogut.getOpenedChapter(book, chapter);
            neogut.loadExtTemplate('editor').then(templates => {
                $editorContainer.append(templates[0]());

                const process = contents => {
                    $('#html-preview').html(neogut.showdown.makeHtml(contents));

                    neogut.editor = ace.edit('md-editor');
                    neogut.editor.$blockScrolling = Infinity;

                    if (localStorage.getItem('editor-theme')) {
                        neogut.editor.setTheme(localStorage.getItem('editor-theme'));
                    }
                    let MdMode = ace.require('ace/mode/markdown').Mode;
                    neogut.editor.session.setMode(new MdMode());
                    neogut.editor.setValue(contents, -1);
                    neogut.getOpenedChapter(book, chapter).markdown = contents;
                    neogut.bindBookEvents();
                    resolve();
                };

                if (opened && opened.markdown) {
                    process(opened.markdown);
                } else {
                    backend.getChapter(book, chapter).then(process);
                }

            });

        });
    },
    /**
     * Opens the specified book's style sheet.
     * @param {string} book The name of the book.
     * @returns {Promise} A future resolved once the book styles are opened.
     */
    openBookStyle: book => {
        if (neogut.getOpenedChapter(book, null) === null) {
            neogut.openedFiles.push({book, chapter: null});
            return new Promise(resolve => {
                neogut.loadExtTemplate('tab').then(templates => {
                    $('.tab-group').append(templates[0]({book, chapter: null}));
                    neogut.bindBookEvents();
                    neogut.showBookStyleEditor(book).then(resolve);
                });
            });
        } else {
            return new Promise(r => neogut.showBookStyleEditor(book).then(r));
        }
    },
    showBookStyleEditor: book => new Promise(resolve => {
        $('.tab-item.active').removeClass('active');
        $('.tab-item[data-book="' + book + '"][data-chapter=""]').addClass('active');

        $('.nav-group-title.active').removeClass('active');
        $('.nav-group-title[data-book="' + book + '"]').addClass('active');

        const $editorContainer = $('#editor-container').empty();
        const opened = neogut.getOpenedChapter(book, null);
        neogut.loadExtTemplate('editor').then(templates => {
            $editorContainer.append(templates[0]());

            const process = contents => {
                $('#html-preview').parent().hide();
                $('#md-editor').parent().css('width', '100%');
                neogut.editor = ace.edit('md-editor');
                neogut.editor.$blockScrolling = Infinity;

                if (localStorage.getItem('editor-theme')) {
                    neogut.editor.setTheme(localStorage.getItem('editor-theme'));
                }
                let scssMode = ace.require('ace/mode/scss').Mode;
                neogut.editor.session.setMode(new scssMode());
                neogut.editor.setValue(contents, -1);
                neogut.getOpenedChapter(book, null).markdown = contents;
                neogut.bindBookEvents();
                resolve();
            };

            if (opened && opened.markdown) {
                process(opened.markdown);
            } else {
                backend.getBookStyle(book).then(process);
            }
        });

    }),
    /**
     * Binds the global event, the ones that last for the duration of the application. Then calls bindBookEvents.
     * @returns {undefined}
     */
    bindGlobalEvents: () => {
        $(document).keydown(e => {
            if (e.ctrlKey) {
                const $tab = $('.tab-item.active');
                const book = $tab.data('book');
                const chapter = $tab.data('chapter');
                switch (e.which) {
                    case 87: /* W */
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
                    case 83: /* S */
                        if (e.shiftKey) {
                            neogut.openedFiles.forEach(file => neogut.saveChapter(file.book, file.chapter));
                        } else {
                            neogut.saveChapter(book, chapter);
                        }
                        break;
                    case 9: /* TAB */
                        // eslint-disable-next-line no-case-declarations
                        let index = neogut.getOpenedChapterIndex(book, chapter);
                        if (e.shiftKey) {
                            index--;
                            if (index < 0) {
                                index = neogut.openedFiles.length - 1;
                            }
                        } else {
                            index++;
                            if (index > neogut.openedFiles.length - 1) {
                                index = 0;
                            }
                        }
                        neogut.showChapterEditor(neogut.openedFiles[index].book, neogut.openedFiles[index].chapter);
                        break;
                    case 73: /* I */
                        if (e.shiftKey) {
                            backend.openDevTool();
                        }
                        break;
                }
            }
        });
        $('#btn-create-book').off('click').on('click', () => smalltalk.prompt('Create book', 'Please enter the title of the book.').then(value => {
            if (value && value.trim().length > 0) {
                backend.createBook(value.trim()).then(neogut.bindAllBooks).then(neogut.bindBookEvents);
            }
        }));
        $('#btn-create-chapter').off('click').on('click', () => {
            const active = $('.nav-group-title.active');
            if (active.length > 0) {
                smalltalk.prompt('Create chapter', 'Please enter the title of the chapter.').then(value => {
                    if (value && value.trim().length > 0) {
                        const newChapter = active.parent().find('.chapter').length + 1;
                        backend.createChapter(active.data('book'), newChapter + '. ' + value.trim()).then(neogut.bindAllBooks).then(neogut.bindBookEvents);
                    }
                });
            } else {
                smalltalk.alert('Please select a book.', 'You may select a book by clicking its name in the sidebar.');
            }
        });
        $('#btn-generate-ebooks').off('click').on('click', () => {
            const active = $('.nav-group-title.active');
            if (active.length > 0) {
                backend.generateBook(active.data('book'), localStorage.getItem('author-name'), progress => $('.toolbar-footer > .title').text(progress)).then(state => {
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
            }).then($modal => {
                const modalBody = $modal.find('.modal-body');
                neogut.loadExtTemplate('settings').then(templates => {
                    modalBody.html(templates[0]());
                    $('#settings-name').off('blur').on('blur', e => localStorage.setItem('author-name',
                        $(e.currentTarget).val())).val(localStorage.getItem('author-name') ?
                        localStorage.getItem('author-name') : ''
                    );
                    $('#settings-editor-theme').off('change').on('change', e => {
                        const newTheme = $(e.currentTarget).val();
                        localStorage.setItem('editor-theme', newTheme);
                        if (neogut.editor) {
                            neogut.editor.setTheme(newTheme);
                        }
                    }).val(localStorage.getItem('editor-theme') ? localStorage.getItem('editor-theme') : '');
                });

            });
        });

        document.addEventListener('paste', e => {
            if (e.clipboardData) {
                let items = e.clipboardData.items;
                if (!items) {
                    return;
                }

                //access data directly
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        //image
                        const blob = items[i].getAsFile();
                        const reader = new window.FileReader();
                        reader.onloadend = () => {
                            if (neogut.editor) {
                                neogut.editor.session.insert(neogut.editor.getCursorPosition(), '![pasted image](' + reader.result + ')');
                            }
                        };
                        reader.readAsDataURL(blob);
                    }
                }
                e.preventDefault();
            }


        }, false);

        $('body').on('dragover', e => {
            e.preventDefault();
            e.stopPropagation();
            $(e.currentTarget).addClass('dragging');
        }).on('dragleave', e => {
            e.preventDefault();
            e.stopPropagation();
            $(e.currentTarget).removeClass('dragging');
        }).on('drop', e => {
            e.preventDefault();
            e.stopPropagation();
            const read = data => {

                const reader = new window.FileReader();
                reader.onloadend = () => {
                    if (neogut.editor) {
                        neogut.editor.session.insert(neogut.editor.getCursorPosition(), '![pasted image](' + reader.result + ')');
                    }
                };
                reader.readAsDataURL(data);
            };

            let dt = e.originalEvent.dataTransfer;
            if (dt && dt.items) {
                dt.items.filter(f => f.kind === 'file').forEach(f => read(f.getAsFile()));
            } else if (dt && dt.files) {
                dt.files.forEach(read);
            }
        });
        neogut.bindBookEvents();
    },
    /**
     * Binds the book related events, rebound every time books/chapters are added/removed.
     * @returns {undefined}
     */
    bindBookEvents: () => {
        $('.nav-group-title').off('click').on('click', e => {
            e.preventDefault();
            e.stopPropagation();
            $('.nav-group-title.active').removeClass('active');
            $(e.currentTarget).addClass('active');
        });
        $('.nav-group-title > .more').off('click').on('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const book = $(e.currentTarget).parent().data('book');
            neogut.getModal({
                title: book,
                data: [
                    {k: 'book', v: book}
                ]
            }).then($modal => {
                const modalBody = $modal.find('.modal-body');
                neogut.loadExtTemplate('book-settings').then(templates => {
                    modalBody.html(templates[0]());
                    backend.getCover(book).then(path => {
                        if (path) {
                            modalBody.find('img').attr('src', 'data:image/png;base64,' + path);
                        }
                    });
                    $('#btn-style-book').off('click').on('click', e => {
                        e.preventDefault();
                        $modal.on('hidden.bs.modal', () => {
                            neogut.openBookStyle(book);
                        });
                        $modal.modal('hide');
                    });
                    $('#btn-set-cover').off('click').on('click', e => {
                        e.preventDefault();
                        backend.setCover(book).then(() => backend.getCover(book).then(path => {
                            if (path) {
                                modalBody.find('img').attr('src', 'data:image/png;base64,' + path);
                            }
                        }));
                    });
                    $('#btn-delete-cover').off('click').on('click', e => {
                        e.preventDefault();
                        backend.deleteCover(book).then(() => modalBody.find('img').attr('src', ''));
                    });
                    $('#btn-rename-book').off('click').on('click', e => {
                        e.preventDefault();
                        smalltalk.prompt('Rename', 'Please enter the new book name', book).then(value => {
                            if (value && value.trim().length > 0) {
                                backend.renameBook(book, value).then(err => {
                                    if (err) {
                                        // eslint-disable-next-line no-console
                                        console.log(err);
                                    }
                                    $modal.on('hidden.bs.modal', () => neogut.bindAllBooks().then(neogut.bindBookEvents));
                                    $modal.modal('hide');
                                });
                            }
                        });
                    });
                    $('#btn-delete-book').off('click').on('click', e => {
                        e.preventDefault();
                        smalltalk.confirm('Are you sure?', 'If you click ok, the book "' + book + '" will be deleted and unrecoverable.').then(() => {
                            backend.deleteBook(book).then(res => {
                                if (res) {
                                    smalltalk.alert('Error', res);
                                }
                                $modal.on('hidden.bs.modal', () => neogut.bindAllBooks().then(neogut.bindBookEvents));
                                $modal.modal('hide');
                            });
                        });
                    });
                    backend.getBookFonts(book).then(fonts => {
                        fonts.forEach(font => modalBody.find('.checkbox.ff-' + font + ' input').attr('checked', true));
                        modalBody.find('.checkbox[class*="ff-"] > label > input[type="checkbox"]').off('change').on('change', e => {
                            const $this = $(e.currentTarget);
                            const font = $this.parents('.checkbox').attr('class').match(/ff-.*$/g)[0].substring(3);
                            if ($this.is(':checked')) {
                                backend.addFont(book, font);
                            } else {
                                backend.removeFont(book, font);
                            }
                        });
                    });
                });
            });
        });
        $('.chapter').off('click').on('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const $this = $(e.currentTarget);
            const book = $this.data('book');
            const chapter = $this.data('chapter');
            neogut.openChapter(book, chapter);
        });
        $('.chapter > .more').off('click').on('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const $this = $(e.currentTarget).parent();
            const book = $this.data('book');
            const chapter = $this.data('chapter');
            neogut.getModal({
                title: book + ' - ' + chapter,
                data: [
                    {k: 'book', v: book},
                    {k: 'chapter', v: chapter}
                ]
            }).then($modal => {
                const modalBody = $modal.find('.modal-body');
                neogut.loadExtTemplate('chapter-settings').then(templates => {
                    modalBody.html(templates[0]());
                    $('#btn-rename-chapter').off('click').on('click', e => {
                        e.preventDefault();
                        smalltalk.prompt('Rename', 'Please enter the new chapter name', chapter.substring(chapter.indexOf('.') + 2, chapter.length - 3)).then(value => {
                            if (value && value.trim().length > 0) {
                                backend.renameChapter(book, chapter, value).then(() => $modal.on('hidden.bs.modal', err => {
                                    if (err) {
                                        // eslint-disable-next-line no-console
                                        console.log(err);
                                    }
                                    neogut.bindAllBooks().then(neogut.bindBookEvents);
                                }).modal('hide'));
                            }
                        });
                    });
                    $('#btn-delete-chapter').off('click').on('click', e => {
                        e.preventDefault();
                        smalltalk.confirm('Are you sure?', 'If you click ok, the chapter "' + book + ' - ' + chapter + '" will be deleted and unrecoverable.').then(() =>
                            backend.deleteChapter(book, chapter).then(res => {
                                if (res) {
                                    smalltalk.alert('Error', res);
                                }
                                $modal.on('hidden.bs.modal', () => neogut.bindAllBooks().then(neogut.bindBookEvents));
                                $modal.modal('hide');
                            }));
                    });
                });

            });
        });
        $('.tab-item').off('click').on('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const $this = $(e.currentTarget);
            const book = $this.data('book');
            const chapter = $this.data('chapter');
            neogut.showChapterEditor(book, chapter);
        });
        $('.tab-item > .close').off('click').on('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const $parent = $(e.currentTarget).parent();
            const book = $parent.data('book');
            const chapter = $parent.data('chapter');
            neogut.closeChapter(book, chapter);
        });


        if (neogut.editor) {
            neogut.editor.off('input');
            neogut.editor.on('input', () => {
                if (neogut.editor) {
                    const markdown = neogut.editor.getValue();
                    $('#html-preview').html(neogut.showdown.makeHtml(markdown));
                    const $activeTab = $('.tab-item.active');
                    const book = $activeTab.data('book');
                    const chapter = $activeTab.data('chapter');
                    const opened = neogut.getOpenedChapter(book, chapter);

                    if (opened.markdown !== null && opened.markdown !== markdown) {
                        $activeTab.addClass('has-changes');
                    }
                    opened.markdown = markdown;
                }
            });
        }

        let source;
        $('.chapter').each((i, item) => {
            const $this = $(item);
            const book = $this.data('book');
            $this.draggable({
                helper: 'clone',
                revert: 'invalid',
                start: e => source = $(e.target).css('opacity', '.5'),
                stop: e => $(e.target).css('opacity', '1')
            }).droppable({
                accept: '.chapter[data-book="' + book + '"]',
                drop: e => backend.moveAfter(book, $(e.target).data('chapter'), source.data('chapter')).then(neogut.bindAllBooks).then(neogut.bindBookEvents)
            });
        });
    }
};
