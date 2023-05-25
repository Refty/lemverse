import { guestAllowed, permissionTypes } from '../../lib/misc'

const talking = () => !!peer.remoteStreamsByUsers.get().length

Template.userPanel.onCreated(function () {
    if (Meteor.settings.public.features?.userPanel?.enabled === false) return
    if (!Meteor.userId()) return

    hotkeys('space', { scope: scopes.player }, () => toggleUserProperty('shareAudio'))
    hotkeys('shift+1', { scope: scopes.player }, () => toggleUserProperty('shareAudio'))
    hotkeys('shift+2', { scope: scopes.player }, () => toggleUserProperty('shareVideo'))
    hotkeys('shift+3', { scope: scopes.player }, () => toggleUserProperty('shareScreen'))
    hotkeys('shift+4', { scope: scopes.player }, () => toggleModal('settingsMain'))
})

Template.userPanel.onDestroyed(() => {
    hotkeys.unbind('space', scopes.player)
    hotkeys.unbind('shift+1', scopes.player)
    hotkeys.unbind('shift+2', scopes.player)
    hotkeys.unbind('shift+3', scopes.player)
    hotkeys.unbind('shift+4', scopes.player)
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
    'focus .user-panel': function (event) {
        event.currentTarget.classList.toggle('visible', true)
        document.querySelector('.js-openpanel').classList.toggle('displaynone', true)
    },
    'blur .user-panel': function (event) {
        event.currentTarget.classList.toggle('visible', false)
        document.querySelector('.js-openpanel').classList.toggle('displaynone', false)
    },
})
