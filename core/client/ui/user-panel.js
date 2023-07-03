import { guestAllowed, permissionTypes } from '../../lib/misc'

const talking = () => Session.get('isLowLevelActive')

Template.userPanel.onCreated(function () {
    if (Meteor.settings.public.features?.userPanel?.enabled === false) return
    if (!Meteor.userId()) return

    this.canZoomIn = new ReactiveVar(game ? game.scene.getScene('WorldScene').canZoomIn() : true)
    this.canZoomOut = new ReactiveVar(game ? game.scene.getScene('WorldScene').canZoomOut() : true)

    hotkeys('space', { scope: scopes.player }, () => toggleUserProperty('shareAudio'))
    hotkeys('shift+1', { scope: scopes.player }, () => toggleUserProperty('shareAudio'))
    hotkeys('shift+2', { scope: scopes.player }, () => toggleUserProperty('shareVideo'))
    hotkeys('shift+3', { scope: scopes.player }, () => toggleUserProperty('shareScreen'))
    hotkeys('shift+4', { scope: scopes.player }, () => toggleModal('settingsMain'))
    this.onZoom = (e) => {
        this.canZoomIn.set(e.detail.scene.canZoomIn())
        this.canZoomOut.set(e.detail.scene.canZoomOut())
    }
    window.addEventListener(eventTypes.onZoom, this.onZoom)
})

Template.userPanel.onDestroyed(() => {
    hotkeys.unbind('space', scopes.player)
    hotkeys.unbind('shift+1', scopes.player)
    hotkeys.unbind('shift+2', scopes.player)
    hotkeys.unbind('shift+3', scopes.player)
    hotkeys.unbind('shift+4', scopes.player)
    window.removeEventListener(eventTypes.onZoom, this.onZoom)
})

Template.userPanel.helpers({
    active() {
        return talking()
    },
    avatarURL() {
        return talking() && Template.instance().avatarURL.get()
    },
    screenSharing() {
        return Meteor.user({ fields: { 'profile.shareScreen': 1 } })?.profile.shareScreen
    },
    videoActive() {
        return talking() && Meteor.user({ fields: { 'profile.shareVideo': 1 } })?.profile.shareVideo
    },
    displayUserPanel() {
        return Meteor.settings.public.features?.userPanel?.enabled !== false && Meteor.userId()
    },
    canTalkToUser() {
        return (
            !Meteor.user({ fields: { 'profile.guest': 1 } })?.profile.guest || guestAllowed(permissionTypes.talkToUsers)
        )
    },
    canUseMessaging() {
        return (
            !Meteor.user({ fields: { 'profile.guest': 1 } })?.profile.guest ||
            guestAllowed(permissionTypes.useMessaging)
        )
    },
    canZoomIn() {
        return Template.instance().canZoomIn.get()
    },
    canZoomOut() {
        return Template.instance().canZoomOut.get()
    },
})

Template.userPanel.events({
    'click .button.audio': function (event) {
        event.preventDefault()
        event.stopPropagation()
        toggleUserProperty('shareAudio')
    },
    'click .button.video': function (event) {
        event.preventDefault()
        event.stopPropagation()
        toggleUserProperty('shareVideo')
    },
    'click .button.screen': function (event) {
        event.preventDefault()
        event.stopPropagation()
        toggleUserProperty('shareScreen')
    },
    'click .button.settings': function (event) {
        event.preventDefault()
        event.stopPropagation()
        toggleModal('settingsMain')
    },
    'click .button.js-show-messaging-interface': function (event) {
        event.preventDefault()
        event.stopPropagation()
        openConsole(true)
    },
    'click .button.js-show-users': function (event) {
        event.preventDefault()
        event.stopPropagation()
        toggleModal('userList')
    },
    'click .button.zoom-in': function (event) {
        event.preventDefault()
        event.stopPropagation()
        game.scene.getScene('WorldScene').zoomDelta(-100)
    },
    'click .button.zoom-out': function (event) {
        event.preventDefault()
        event.stopPropagation()
        game.scene.getScene('WorldScene').zoomDelta(100)
    },
})
