const toggleMinimize = (templateInstance) => templateInstance.minimized.set(!templateInstance.minimized.get())

const switchDirection = (templateInstance) => templateInstance.right.set(!templateInstance.right.get())

const wake = () => {
    hotkeys.setScope(scopes.editor)

    if (!Session.get('editorSelectedMenu')) Session.set('editorSelectedMenu', editorModes.tiles)
    game.scene.keys.EditorScene.scene.wake()
}

const sleep = () => {
    hotkeys.setScope(scopes.player)

    game?.scene.getScene('EditorScene')?.scene.sleep()
    levelManager.drawTriggers(false)
}

Template.editToolbox.onCreated(function () {
    this.minimized = new ReactiveVar(false)
    this.right = new ReactiveVar(true)

    Session.set('editorSelectedMenu', undefined)

    this.autorun(() => {
        if (Session.get('editor')) {
            this.minimized.set(false)
            wake()
        } else sleep()
    })

    hotkeys('h', { scope: scopes.editor }, (event) => {
        if (event.repeat) return
        event.preventDefault()
        toggleMinimize(this)
    })
    hotkeys('shift+1', { scope: scopes.editor }, () => Session.set('editorSelectedMenu', editorModes.tiles))
    hotkeys('shift+2', { scope: scopes.editor }, () => Session.set('editorSelectedMenu', editorModes.zones))
    hotkeys('shift+3', { scope: scopes.editor }, () => Session.set('editorSelectedMenu', editorModes.entities))
    hotkeys('shift+4', { scope: scopes.editor }, () => Session.set('editorSelectedMenu', editorModes.level))
    hotkeys('shift+0', { scope: scopes.editor }, (event) => {
        if (event.repeat) return
        levelManager.drawTriggers(!levelManager.teleporterGraphics.length)
    })
})

Template.editToolbox.onDestroyed(() => {
    hotkeys.unbind('h', scopes.editor)
    hotkeys.unbind('shift+1', scopes.editor)
    hotkeys.unbind('shift+2', scopes.editor)
    hotkeys.unbind('shift+3', scopes.editor)
    hotkeys.unbind('shift+4', scopes.editor)
    hotkeys.unbind('shift+0', scopes.editor)
    hotkeys.setScope(scopes.player)
})

Template.editToolbox.events({
    'click .js-menus-select': function (event) {
        Session.set('editorSelectedMenu', event.currentTarget.dataset.menu)
    },
    'click .js-menus-shrink': function (event, templateInstance) {
        toggleMinimize(templateInstance)
    },
    'click .js-menus-dock': function (event, templateInstance) {
        switchDirection(templateInstance)
    },
    'click .js-menus-undo': function () {
        game.scene.keys.EditorScene.undo()
    },
    'click .js-menus-redo': function () {
        game.scene.keys.EditorScene.redo()
    },
})

Template.editToolbox.helpers({
    minimized() {
        return Template.instance().minimized.get()
    },
    right() {
        return Template.instance().right.get()
    },
    direction() {
        return Template.instance().minimized.get() !== Template.instance().right.get()
    },
})
