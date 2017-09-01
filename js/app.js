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
 *   © Oproma inc. All rights reserved.
 */


const remote = require('electron').remote;
const mainProcess = remote.require('./main.js');

$(document).ready(() => {
    neogut.bindBooks();
});

window.neogut = {
    state: {
        openedFiles: []
    },
    loadExtTemplate: (path, callback) => {
        const loadSingleTemplate = (p, internalCallback) => {
            if (!p.startsWith('templates/')) {
                p = 'templates/' + p;
            }

            if (!p.endsWith(".html")) {
                p += ".html";
            }
            const scriptId = p.replace(/\./g, "-").replace(/\//g, "-");
            if ($('#' + scriptId).length > 0) {
                internalCallback($('#' + scriptId).html());
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
                    internalCallback(templateData);
                }
            });
        };
        if (_.isString(path)) {
            loadSingleTemplate(path, (template) => {
                callback(template);
            });
        } else if (_.isArray(path)) {
            var promises = [];
            path.forEach((p) => {
                promises.push(new Promise((resolve) => {
                    loadSingleTemplate(p, (template) => {
                        resolve(template);
                    });
                }));
            });
            Promise.all(promises).then((templates) => {
                callback.apply(this, templates);
            });
        }
    },
    bindBooks: () => {
        neogut.loadExtTemplate(['book'], (bookerT) => {
            bookerT = Handlebars.compile(bookerT);
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
                    const $sidebar = $('.sidebar');
                    Promise.all(promises).then((values) => {
                        values.forEach((value) => {
                            $sidebar.append(bookerT(value));
                        });
                    });



                });
            });

        });
    }
};