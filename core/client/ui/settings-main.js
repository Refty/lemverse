const getDefaultActivePage = () =>
    Meteor.settings.public.permissions.allowProfileEdition ? 'settingsBasic' : 'settingsCharacter'

Template.settingsMain.onCreated(() => {
    Session.set('activeSettingsPage', getDefaultActivePage())
})

Template.settingsMain.helpers({
    activePage() {
        return Session.get('activeSettingsPage') || getDefaultActivePage()
    },
})

Template.settingsMain.events({
    'click .js-logout': function (event) {
        event.preventDefault()
        event.stopPropagation()
        lp.notif.confirm(
            'Logout',
            `You will be disconnected from ${Meteor.settings.public.lp.product}, are you sure ?`,
            () => {
                closeModal()
                Meteor.logout()
            }
        )
    },
    'click .js-menu-entry': function (event) {
        Session.set('activeSettingsPage', event.currentTarget.dataset.page)
    },
})
