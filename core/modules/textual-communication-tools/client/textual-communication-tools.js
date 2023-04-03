import { moduleType } from '../../../client/helpers'
import { guestAllowed, canUseLevelFeature } from '../../../lib/misc'

const permissionType = 'useMessaging'

window.addEventListener('load', () => {
    registerModules(['textualCommunicationTools'], moduleType.GAME)
    registerModules(['userListMessageButton'], moduleType.USER_LIST)

    Tracker.autorun((track) => {
        if (Session.get('loading')) return

        const user = Meteor.user()
        if (!user) return

        if (user.roles?.admin) {
            registerModules(
                [
                    {
                        id: 'open-console',
                        icon: '💬',
                        shortcut: 56,
                        order: 41,
                        label: 'Text',
                        closeMenu: true,
                        scope: 'me',
                    },
                ],
                moduleType.RADIAL_MENU
            )
        }
        if (user.roles?.admin || canUseLevelFeature(Meteor.user(), 'sendText')) {
            registerModules(
                [
                    {
                        id: 'send-text',
                        icon: '💬',
                        shortcut: 56,
                        order: 41,
                        label: 'Text',
                        closeMenu: true,
                        scope: 'other',
                    },
                ],
                moduleType.RADIAL_MENU
            )
        }

        track.stop()
    })
})

const openMessagingInterface = (channel) => {
    closeModal()
    messagesModule.changeMessagesChannel(channel)
    openConsole()
}

const onMenuOptionSelected = (e) => {
    const { option, user } = e.detail

    if (option.id === 'open-console') openConsole(true)
    else if (option.id === 'send-text' && user && canUseLevelFeature(Meteor.user(), 'sendText', true)) {
        const channel = [user._id, Meteor.userId()].sort().join(';')
        openMessagingInterface(channel)
    }
}

const onPeerDataReceived = (e) => {
    const { data, meta } = e.detail
    if (data.type !== 'text') return
    if (!meta['pop-in']) return

    meta['pop-in'].on('click', () => {
        if (!data.data.channel) return
        openMessagingInterface(data.data.channel)
    })
}

Template.textualCommunicationTools.onCreated(() => {
    messagesModule.init()
    window.addEventListener(eventTypes.onMenuOptionSelected, onMenuOptionSelected)
    window.addEventListener(eventTypes.onPeerDataReceived, onPeerDataReceived)
})

Template.textualCommunicationTools.onDestroyed(() => {
    window.removeEventListener(eventTypes.onMenuOptionSelected, onMenuOptionSelected)
    window.removeEventListener(eventTypes.onPeerDataReceived, onPeerDataReceived)
})

Template.textualCommunicationTools.helpers({
    show: () => Session.get('console'),
    canUseModule: () => {
        const guest = Meteor.user({ fields: { 'profile.guest': 1 } })?.profile.guest
        if (guest) return guestAllowed(permissionType)

        return true
    },
    useGenericChat: () => Meteor.settings.public.features?.useMessaging?.enabled !== false,
})
