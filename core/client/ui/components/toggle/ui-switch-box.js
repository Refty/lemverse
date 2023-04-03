Template.uiSwitchBox.helpers({
    checked() {
        return this.checked && !this.disabled
    },
})

Template.uiSwitchBox.events({
    'change input': function (event, templateInstance) {
        Session.set(templateInstance.data.name, event.currentTarget.checked)
    },
})
