import { canEditLevel, canModerateLevel, canModerateUser, canEditUserPermissions, isLevelOwner } from '../../lib/misc'

const userFields = {
    'status.online': 1,
    'profile.name': 1,
    'profile.fullName': 1,
    'profile.baseline': 1,
    'profile.x': 1,
    'profile.y': 1,
    'profile.levelId': 1,
    roles: 1,
    'profile.body': 1,
    'profile.outfit': 1,
    'profile.eye': 1,
    'profile.hair': 1,
    'profile.accessory': 1,
}

const users = () => {
    const { levelId } = Meteor.user({
        fields: { 'profile.levelId': 1 },
    }).profile

    const filters = {
        'profile.guest': { $not: true },
        'status.online': true,
        'profile.levelId': levelId,
    }

    return Meteor.users.find(filters, {
        sort: { 'profile.name': 1 },
        fields: userFields,
    })
}

const sortUserList = (a, b) => {
    if (a.status.online === b.status.online) {
        const nameA = (a.profile.fullName || a.profile.name || a.username).toLowerCase()
        const nameB = (b.profile.fullName || b.profile.name || b.username).toLowerCase()

        return nameA.localeCompare(nameB)
    }

    return a.status.online ? -1 : 1
}

Template.userListEntry.helpers({
    admin() {
        return this.user.roles?.admin
    },
    canEditLevel() {
        return canEditLevel(this.user, this.level)
    },
    canModerateUser() {
        if (!this.canModerateLevel) return false

        return canModerateUser(Meteor.user({ fields: { roles: 1 } }), this.user)
    },
    levelOwner() {
        if (!this.level) return false
        return isLevelOwner(this.user, this.level)
    },
    modules() {
        return Session.get('userListModules')
    },
    user() {
        return this.user
    },
    name() {
        const profile = this.user?.profile
        return profile?.fullName || profile?.name
    },
})

Template.userListEntry.events({
    'click .js-toggle-edition': function () {
        Meteor.call('toggleLevelEditionPermission', this.user._id)
    },
    'click .js-kick-user': function () {
        Meteor.call('kickUser', this.user._id, (err) => {
            if (err) {
                lp.notif.error(err)
                return
            }

            lp.notif.success('Successfully Kicked!')
        })
    },
    'click .js-profile': function () {
        Session.set('modal', {
            template: 'userProfile',
            userId: this.user._id,
            append: true,
        })
    },
})

Template.userList.onCreated(function () {
    this.currentLevel = Levels.findOne()
})

Template.userList.helpers({
    canEditUserPermissions() {
        return canEditUserPermissions(Meteor.user(), Template.instance().currentLevel)
    },
    canModerateLevel() {
        return canModerateLevel(Meteor.user(), Template.instance().currentLevel)
    },
    level() {
        return Template.instance().currentLevel
    },
    title() {
        return "Users online"
    },
    users() {
        return users().fetch().sort(sortUserList)
    },
})
