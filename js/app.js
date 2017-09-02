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


/* global Promise */

const remote = require('electron').remote;
const mainProcess = remote.require('./main.js');

$(document).ready(() => {
    neogut.buildApp();
});

window.neogut = {
    state: {
        openedFiles: []
    },
    showdown: new showdown.Converter({
        strikethrough: true,
        tables: true
    }),

    editor: null,
    markdown: null,
    /**
     * Loads an external template, passing it to the callback function.
     * @param {array|string} path The name/path to the template, can ommit leading "template/" and trailing ".html"
     * @param {function} callback
     * @returns {undefined}
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
     * Pulls the list of books and binds them to the UI.
     * @returns {Promise} 
     */
    bindAllBooks: () => {
        return new Promise((resolve) => {
            neogut.loadExtTemplate(['book']).then((templates) => {
                const promises = [];
                mainProcess.listBooks((books) => {
                    books.forEach((book) => {
                        promises.push(new Promise((resolve) => {
                            mainProcess.listChapters(book, (chapters) => {
                                resolve({
                                    book,
                                    chapters
                                });
                            });
                        }));
                        const $sidebar = $('.sidebar').empty();
                        Promise.all(promises).then((values) => {
                            values.forEach((value) => {
                                $sidebar.append(templates[0](value));
                            });
                            resolve();
                        });
                    });
                });

            });
        });
    },

    getOpenedChapter: (book, chapter) => {
        for (let i = 0; i < neogut.state.openedFiles.length; i++) {
            if (neogut.state.openedFiles[i].book === book && neogut.state.openedFiles[i].chapter === chapter) {
                return neogut.state.openedFiles[i];
            }
        }
        return null;
    },

    openChapter: (book, chapter) => {
        if (neogut.getOpenedChapter(book, chapter) === null) {
            neogut.state.openedFiles.push({book, chapter});
            return new Promise((resolve) => {
                neogut.loadExtTemplate('tab').then((templates) => {
                    $('.tab-group').append(templates[0]({book, chapter}));
                    neogut.bindEvents();
                    neogut.showChapterEditor(book, chapter).then(resolve);
                });
            });
        } else {
            return new Promise((resolve) => {
                neogut.showChapterEditor(book, chapter).then(resolve);
            });
        }
    },

    closeChapter: (book, chapter) => {
        return new Promise((resolve) => {
            let prev = null;
            for (let i = 0; i < neogut.state.openedFiles.length; i++) {
                if (neogut.state.openedFiles[i].book === book && neogut.state.openedFiles[i].chapter === chapter) {
                    neogut.state.openedFiles.splice(i, 1);
                    break;
                }
                prev = neogut.state.openedFiles[i];
            }
            $('.tab-item[data-book="' + book + '"][data-chapter="' + chapter + '"]').remove();

            if (neogut.state.openedFiles.length > 0) {
                if (prev === null) {
                    prev = neogut.state.openedFiles[0];
                }
                neogut.showChapterEditor(prev.book, prev.chapter);
            } else {
                neogut.editor = null;
                $('#editor-container').empty();
                resolve();
            }
        });
    },
    saveChapter: (book, chapter) => {
        if (neogut.editor) {
            neogut.editor.off('input');
            neogut.editor.on('input', () => {
                $('#html-preview').html(neogut.showdown.makeHtml(neogut.editor.getValue()));
            });
            return new Promise((resolve) => {
                mainProcess.saveChapter(book, chapter, neogut.getOpenedChapter(book, chapter).markdown, (err) => {
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
    showChapterEditor: (book, chapter) => {
        return new Promise((resolve) => {
            $('.tab-item').removeClass('active');
            $('.tab-item[data-book="' + book + '"][data-chapter="' + chapter + '"]').addClass('active');
            const $editorContainer = $('#editor-container').empty(), opened = neogut.getOpenedChapter(book, chapter);
            neogut.loadExtTemplate('editor').then((templates) => {
                $editorContainer.append(templates[0]());

                const process = (contents) => {
                    $('#html-preview').html(neogut.showdown.makeHtml(contents));

                    neogut.editor = ace.edit("md-editor");
                    neogut.editor.$blockScrolling = Infinity;
                    //neogut.editor.setTheme("ace/theme/monokai");
                    var MdMode = ace.require("ace/mode/markdown").Mode;
                    neogut.editor.session.setMode(new MdMode());
                    neogut.editor.setValue(contents, -1);
                    neogut.getOpenedChapter(book, chapter).markdown = contents;
                    neogut.bindEvents();
                    resolve();
                };

                if (opened && opened.markdown) {
                    process(opened.markdown);
                } else {
                    mainProcess.getChapter(book, chapter, process);
                }

            });

        });
    },
    bindGlobalEvents: () => {
        $(document).keydown((e) => {
            if (e.ctrlKey) {
                const $tab = $('.tab-item.active'), book = $tab.data('book'), chapter = $tab.data('chapter');
                switch (e.which) {
                    case 87 /* W */ :
                        neogut.closeChapter(book, chapter);
                        break;
                    case 83 /* S */ :
                        if (e.shiftKey) {
                            neogut.state.openedFiles.forEach((file) => {
                                neogut.saveChapter(file.book, file.chapter);
                            });
                        } else {
                            neogut.saveChapter(book, chapter);
                        }
                        break;
                    case 123 /* F12 */ :
                        if (e.shiftKey) {
                            mainProcess.openDevTool();
                        }
                        break;
                }
            }
        });
        neogut.bindEvents();
    },
    bindEvents: () => {
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
            alert('TODO: Show settings for ' + book + ' - ' + chapter);
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
        $('.nav-group-title > .more').off('click').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const $this = $(e.currentTarget), book = $this.data('book');
            alert('TODO: Show settings for ' + book);
        });

        if (neogut.editor) {
            neogut.editor.off('input');
            neogut.editor.on('input', () => {
                const markdown = neogut.editor.getValue();
                $('#html-preview').html(neogut.showdown.makeHtml(markdown));
                const $activeTab = $('.tab-item.active'), book = $activeTab.data('book'), chapter = $activeTab.data('chapter'),
                        opened = neogut.getOpenedChapter(book, chapter);

                if (opened.markdown !== null && opened.markdown !== markdown) {
                    $activeTab.addClass('has-changes');
                }
                opened.markdown = markdown;
            });
        }
    },
    /**
     * Builds the current state of the app
     * @returns {undefined}
     */
    buildApp: () => {
        neogut.bindAllBooks().then(neogut.bindGlobalEvents);
    }
};