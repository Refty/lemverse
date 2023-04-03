Template.editorMenu.events({
    'click .js-menu-editor': function (event) {
        Session.set('editorMenu', event.currentTarget.dataset.type)
    },
})
