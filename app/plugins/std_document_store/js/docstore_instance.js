/* Haplo Platform                                     http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var DocumentInstance = P.DocumentInstance = function(store, key) {
    this.store = store;
    this.key = key;
    this.keyId = store._keyToKeyId(key);
    this.forms = store._formsForKey(key);
};

// ----------------------------------------------------------------------------

DocumentInstance.prototype.__defineGetter__("currentDocument", function() {
    // Try current version first
    var current = this.store.currentTable.select().where("keyId","=",this.keyId);
    if(current.length > 0) {
        return JSON.parse(current[0].json);
    }
    // Fall back to last committed version or a blank document
    return this.lastCommittedDocument;
});

// Are there some edits outstanding?
DocumentInstance.prototype.__defineGetter__("currentDocumentIsEdited", function() {
    return this.store.currentTable.select().where("keyId","=",this.keyId).length > 0;
});

// If there isn't a current document, check the committed version
DocumentInstance.prototype.__defineGetter__("currentDocumentIsComplete", function() {
    var current = this.store.currentTable.select().where("keyId","=",this.keyId);
    if(current.length > 0) {
        return current[0].complete;
    }
    return this.committedDocumentIsComplete;
});

DocumentInstance.prototype.__defineGetter__("committedDocumentIsComplete", function() {
    var committed = this.store.versionsTable.select().where("keyId","=",this.keyId).
        order("version", true);
    if(committed.length > 0) {
        var record = committed[0];
        var document = JSON.parse(record.json);
        var isComplete = true;
        _.each(this.forms, function(form) {
            var instance = form.instance(document);
            if(!instance.documentWouldValidate()) {
                isComplete = false;
            }
        });
        return isComplete;
    } else {
        return false;
    }
});

// ----------------------------------------------------------------------------

DocumentInstance.prototype.setCurrentDocument = function(document, isComplete) {
    var json = JSON.stringify(document);
    var current = this.store.currentTable.select().where("keyId","=",this.keyId);
    var row = (current.length > 0) ? current[0] :
        this.store.currentTable.create({keyId:this.keyId});
    row.json = json;
    row.complete = isComplete;
    row.save();
};

DocumentInstance.prototype.__defineSetter__("currentDocument", function(document) {
    this.setCurrentDocument(document, true /* assume complete */);
});

// ----------------------------------------------------------------------------

// Returns a blank document is there isn't a last committed version
DocumentInstance.prototype.__defineGetter__("lastCommittedDocument", function() {
    var lastVersion = this.store.versionsTable.select().
        where("keyId","=",this.keyId).order("version",true).limit(1);
    return (lastVersion.length > 0) ? JSON.parse(lastVersion[0].json) :
        this.store._blankDocumentForKey(this.key);
});

DocumentInstance.prototype.__defineGetter__("hasCommittedDocument", function() {
    return (0 < this.store.versionsTable.select().where("keyId","=",this.keyId).
        order("version",true).limit(1).length);
});

// ----------------------------------------------------------------------------

DocumentInstance.prototype.getAllVersions = function() {
    return _.map(this.store.versionsTable.select().where("keyId","=",this.keyId).
        order("version"), function(row) {
            return {
                version: row.version,
                date: new Date(row.version),
                user: row.user,
                document: JSON.parse(row.json)
            };
        }
    );
};

// ----------------------------------------------------------------------------

// Commit the editing version, maybe duplicating the last version or committing
// a blank document
DocumentInstance.prototype.commit = function(user) {
    // Get JSON directly from current version?
    var current = this.store.currentTable.select().where("keyId","=",this.keyId);
    var json  = (current.length > 0) ? current[0].json : undefined;
    // Create a new version, if no current JSON, fall back to lastCommittedDocument
    // which may just be a blank document.
    this.store.versionsTable.create({
        keyId: this.keyId,
        json: json || JSON.stringify(this.lastCommittedDocument),
        version: Date.now(),
        user: user || O.currentUser
    }).save();
    // Delete any last version
    if(current.length > 0) {
        current[0].deleteObject();
    }
};

// ----------------------------------------------------------------------------

// Render as document
DocumentInstance.prototype._renderDocument = function(document) {
    var html = [];
    var delegate = this.store.delegate;
    var key = this.key;
    _.each(this.forms, function(form) {
        var instance = form.instance(document);
        if(delegate.prepareFormInstance) {
            delegate.prepareFormInstance(key, form, instance, "document");
        }
        html.push(
            '<div id="', _.escape(form.specification.formId), '">',
                '<h2>', form.specification.formTitle, '</h2>',
                instance.renderDocument(),
            '</div>'
        );
    });
    return html.join('');
};

DocumentInstance.prototype._selectedFormInfo = function(document, selectedFormId) {
    var delegate = this.store.delegate;
    var key = this.key;
    var form;
    if(selectedFormId) {
        form = _.find(this.forms, function(form) {
            return selectedFormId === form.specification.formId;
        });
    }
    if(!form) { form = this.forms[0]; }
    var instance = form.instance(document);
    if(delegate.prepareFormInstance) {
        delegate.prepareFormInstance(key, form, instance, "document");
    }
    return {
        title: form.specification.formTitle,
        instance: instance
    };
};

DocumentInstance.prototype.__defineGetter__("lastCommittedDocumentHTML", function() {
    return this._renderDocument(this.lastCommittedDocument);
});
DocumentInstance.prototype.__defineGetter__("currentDocumentHTML",       function() {
    return this._renderDocument(this.currentDocument);
});

// ----------------------------------------------------------------------------

// Edit current document
DocumentInstance.prototype.handleEditDocument = function(E, actions) {
    // The form ID is encoded into the request somehow
    var untrustedRequestedFormId = this.store._formIdFromRequest(E.request);
    var activePage; // filled in later
    // Set up information about the pages
    var cdocument = this.currentDocument;
    if(this.forms.length === 0) { throw new Error("No form definitions"); }
    var pages = [];
    var delegate = this.store.delegate;
    var j = 0; // pages indexes no longer match forms indexes
    for(var i = 0; i < this.forms.length; ++i) {
        var form = this.forms[i],
            instance = form.instance(cdocument);
        if(!delegate.shouldEditForm || delegate.shouldEditForm(this.key, form)) {
            if(delegate.prepareFormInstance) {
                delegate.prepareFormInstance(this.key, form, instance, "form");
            }
            pages.push({
                index: j,
                form: form,
                instance: instance,
                complete: instance.documentWouldValidate()
            });
            if(form.specification.formId === untrustedRequestedFormId) {
                activePage = pages[j];
            }
            j++;
        }
    }
    pages[pages.length - 1].isLastPage = true;
    var isSinglePage = (pages.length === 1);
    // Default the active page to the first page
    if(!activePage) { activePage = pages[0]; }
    activePage.active = true;
    // What happens next?
    var showFormError = false;
    if(E.request.method === "POST") {
        // Update from the active form
        activePage.instance.update(E.request);
        activePage.complete = activePage.instance.complete;
        var firstIncompletePage = _.find(pages, function(p) { return !p.complete; });
        this.setCurrentDocument(cdocument, !(firstIncompletePage) /* all complete? */);
        // Goto another form?
        var gotoPage = _.find(pages, function(p) {
            return p.form.specification.formId === E.request.parameters.__goto;
        });
        if(gotoPage) {
            return actions.gotoPage(this, E, gotoPage.form.specification.formId);
        } else {
            // If user clicked 'save for later', stop now
            if(E.request.parameters.__later === "s") {
                return actions.finishEditing(this, E, false /* not complete */);
            }
            // If the form is complete, go to the next form, or finish
            if(activePage.instance.complete) {
                if(activePage.isLastPage) {
                    return actions.finishEditing(this, E, true /* everything complete */);
                } else {
                    return actions.gotoPage(this, E,
                        pages[activePage.index+1].form.specification.formId);
                }
            } else {
                showFormError = true;
            }
        }
    }
    // Render the form
    actions.render(this, E, P.template("edit").deferredRender({
        isSinglePage: isSinglePage,
        navigation: isSinglePage ? null :
            P.template("navigation").deferredRender({pages:pages}),
        pages: pages,
        showFormError: showFormError,
        activePage: activePage
    }));
};

// ----------------------------------------------------------------------------

// Viewer UI
DocumentInstance.prototype.makeViewerUI = function(E, options) {
    return new P.DocumentViewer(this, E, options);
};