import { meteorCallWithPromise } from '../../../client/helpers'

const messageMaxLength = 4096

const ignoreChannelAutoSwitch = () => !Session.get('console') || (Session.get('messagesChannel') || '').includes('qst_')

messagesModule = {
    handleChannelMessagesSubscribe: undefined,
    channel: undefined,
    lastZoneEntered: undefined,

    init() {
        Session.set('messagesChannel', undefined)

        const onZoneEntered = (event) => {
            if (ignoreChannelAutoSwitch()) return

            const { zone } = event.detail
            this.lastZoneEntered = zone._id
            this.changeMessagesChannel(zone._id)
        }

        const onZoneLeft = (event) => {
            if (ignoreChannelAutoSwitch()) return

            const { zone } = event.detail
            if (zone._id !== this.lastZoneEntered) return

            const nearUsersChannel = nearUserIdsToString()
            if (nearUsersChannel.length) this.changeMessagesChannel(nearUsersChannel)
            else this.stopListeningMessagesChannel()

            this.lastZoneEntered = undefined
        }

        window.addEventListener(eventTypes.onZoneEntered, onZoneEntered)
        window.addEventListener(eventTypes.onZoneLeft, onZoneLeft)
    },

    autoSelectChannel() {
        if (userProximitySensor.isNearSomeone()) this.changeMessagesChannel(nearUserIdsToString())
        else if (zoneManager.activeZone) this.changeMessagesChannel(zoneManager.activeZone._id)
        else this.changeMessagesChannel(Meteor.user().profile.levelId)
    },

    changeMessagesChannel(channel) {
        if (!channel || channel === this.channel) return

        this.stopListeningMessagesChannel()
        this.handleChannelMessagesSubscribe = Meteor.subscribe('channelMessages', channel)
        this.channel = channel
        Session.set('messagesChannel', channel) // set console in the new channel
    },

    async sendMessage(channel, content, file) {
        if (content.length >= messageMaxLength) throw new Error(`The message is too long (> ${messageMaxLength} chars)`)
        content = lp.purify(content).trim()
        if (!content.length && !file) throw new Error(`Invalid content`)

        window.dispatchEvent(
            new CustomEvent(eventTypes.beforeSendingMessage, {
                detail: { channel, content },
            })
        )

        let messageId
        try {
            messageId = await meteorCallWithPromise('sendMessage', channel, content, file?._id)
        } catch (err) {
            lp.notif.error('You are not authorized to speak here')
        }

        window.dispatchEvent(
            new CustomEvent(eventTypes.afterSendingMessage, {
                detail: { channel, messageId },
            })
        )

        return messageId
    },

    stopListeningMessagesChannel() {
        this.channel = undefined
        this.handleChannelMessagesSubscribe?.stop()
        Session.set('messagesChannel', undefined)
    },
    targetedChannel() {
        if (userProximitySensor.isNearSomeone()) {
            return nearUserIdsToString()
        }

        const loadedChannel = Session.get('messagesChannel')
        if (loadedChannel) {
            return loadedChannel
        }

        if (zoneManager.activeZone) {
            return zoneManager.activeZone._id
        }

        return Meteor.user({ fields: { 'profile.levelId': 1 } })?.profile.levelId
    },
}
