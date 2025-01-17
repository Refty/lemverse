const invitationURL = () => {
    const { levelId } = Meteor.user().profile

    const levelIdWithoutPrefix = levelId.substring(levelId.lastIndexOf('_') + 1)
    const path = FlowRouter.path('invite', { levelId: levelIdWithoutPrefix })

    return `${window.location.protocol}//${window.location.host}${path}`
}

Template.userInvitationField.helpers({
    invitationURL() {
        return invitationURL()
    },
})

Template.userInvitationField.events({
    'click .js-copy-invitation': function (event) {
        event.preventDefault()
        event.stopPropagation()
        navigator.clipboard
            .writeText(invitationURL())
            .then(() => lp.notif.success('✂️ Invitation copied to your clipboard'))
    },
})
