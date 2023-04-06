import { formatText, channelIdToChannelName } from './helpers'

// TODO : Remove message from 'messages' after timeout
const removeToast = (messageId) => {
    const toast = document.querySelector(`#${messageId}`)

    toast.classList.add('hide')

    if (toast.timeoutId) clearTimeout(toast.timeoutId)

    setTimeout(() => toast.remove(), 500)
}

const getTypeOfChannel = (channel) => {
    if (channel.includes('usr_')) return 'private'
    return 'global'
}

Template.messagesPopup.onCreated(function () {
    Meteor.subscribe('messages')
    Session.set('messages', [])

    let lastCreated = new Date()

    this.handleMessagesSubscribe = Messages.find({
        createdBy: { $ne: Meteor.userId() },
    }).observe({
        added(message) {
            if (
                // Prevent last notifications to be shown
                message.createdAt < lastCreated ||
                Session.get('messagesChannel') === message.channel
            )
                return

            lastCreated = message.createdAt

            const messages = Session.get('messages')
            const toastMessage = messages.push({
                id: message._id,
                type: getTypeOfChannel(message.channel),
                channel: message.channel,
                text: formatText(message.text),
                sender: Meteor.users.findOne(message.createdBy)?.profile.name || 'Guest',
                date: message.createdAt.toDateString(),
                time: message.createdAt.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                user: Meteor.users.findOne(message.createdBy),
                canHide: true,
            })

            toastMessage.timeoutId = setTimeout(() => removeToast(message._id), 15000)

            Session.set('messages', messages)
        },
    })
})

Template.messagesPopup.onDestroyed(function () {
    if (this.handleMessagesSubscribe) this.handleMessagesSubscribe.stop()
})

Template.messagesPopup.helpers({
    messages: () => Session.get('messages'),
    channelName: () => channelIdToChannelName(Session.get('messagesChannel'), false),
})

Template.messagesPopup.events({
    'click .toast': function (event) {
        event.preventDefault()
        const messages = Session.get('messages')
        const message = messages.find((item) => item.id === event.currentTarget.id)

        messagesModule.changeMessagesChannel(message.channel)
        openConsole()
        removeToast(event.currentTarget.id)
    },
    'click .cross': function (event) {
        event.preventDefault()
        event.stopPropagation()

        removeToast(event.currentTarget.parentElement.id)
    },
})
