import { guestAllowed, permissionTypes } from '../../lib/misc'

Template.settingsCharacter.onCreated(() => {
    if (!Session.get('settings-character-category')) Session.set('settings-character-category', 'body')
})

Template.settingsCharacter.helpers({
    getAllImages(category) {
        if (category === undefined) category = Session.get('settings-character-category')
        return Characters.find({
            category,
            $or: [{ hide: { $exists: false } }, { hide: false }],
        }).fetch()
    },
    isBodyPart(id) {
        return Meteor.user().profile[Session.get('settings-character-category')] === id
    },
    user() {
        return Meteor.user()
    },
    canEditSkin() {
        return (
            !Meteor.user({ fields: { 'profile.guest': 1 } }).profile.guest || guestAllowed(permissionTypes.changeSkin)
        )
    },
})

Template.settingsCharacter.events({
    'click .js-customize-menu': function (event) {
        Session.set('settings-character-category', event.currentTarget.dataset.category)
    },
    'click .js-new-part': function (event) {
        const { id } = event.currentTarget.dataset
        if (id === 'null') {
            Meteor.users.update(Meteor.userId(), {
                $unset: {
                    [`profile.${Session.get('settings-character-category')}`]: 1,
                },
            })
        } else {
            const part = Characters.findOne({ _id: id })
            if (part)
                Meteor.users.update(Meteor.userId(), {
                    $set: {
                        [`profile.${Session.get('settings-character-category')}`]: id,
                    },
                })
        }
    },
})
