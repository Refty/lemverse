import { formatURL } from '../helpers'

const getUser = (template) => Meteor.users.findOne(template.data.userId)

Template.userProfile.onCreated(function () {
    const { userId } = this.data
    if (!userId) return

    this.subscribe('userProfile', userId, () => {
        Meteor.users.findOne(userId)
    })
})

Template.userProfile.helpers({
    profile() {
        return getUser(Template.instance()).profile
    },
    title() {
        const template = Template.instance()
        return getUser(template).profile.name
    },
    myProfile() {
        return Meteor.userId() === Template.instance().data.userId
    },
    age() {
        return moment().diff(getUser(Template.instance()).createdAt, 'days')
    },
    website() {
        const { website } = getUser(Template.instance()).profile
        if (!website) return null

        const url = formatURL(website)
        if (!url) return null

        return url.href
    },
})

Template.userProfile.events({
    'click .js-title': function (event, templateInstance) {
        navigator.clipboard
            .writeText(getUser(templateInstance)._id)
            .then(() => lp.notif.success('✂️ Identifier copied to your clipboard'))
    },
    'click .js-report': function (event, templateInstance) {
        const { userId } = templateInstance.data
        Session.set('modal', { template: 'report', userId })
    },
})
