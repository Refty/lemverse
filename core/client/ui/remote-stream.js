const maxAttempt = 10
const delayBetweenAttempt = 2000 // in ms

const checkMediaAvailable = (template, type) => {
    const { remoteUser } = template.data
    if (!remoteUser._id) {
        log(`Missing user id in template data`)
        return
    }

    const remoteUserStream = peer.remoteStreamsByUsers.get().find((usr) => usr._id === remoteUser._id)
    if (!remoteUserStream) {
        log(`Stop retry to get ${remoteUser.name}'s ${type}, ${remoteUser.name} is too far`)
        return
    }

    const source = type === streamTypes.screen ? remoteUserStream.screen?.srcObject : remoteUserStream.main?.srcObject
    if (source) {
        template.firstNode.srcObject = source
        template.firstNode.play().catch(() => {
            error(
                `unable to player remote user's media: playback interrupted (${remoteUserStream._id}) : ${template.attempt}`
            )
            setTimeout(() => checkMediaAvailable(template, type), delayBetweenAttempt)
        })
    } else if (template.attempt < maxAttempt) {
        template.attempt++
        log(`Tried to get ${remoteUserStream.name}'s ${type} and failed, attempt : ${template.attempt}`)
        setTimeout(() => checkMediaAvailable(template, type), delayBetweenAttempt)
    } else {
        error(`unable to get user's ${type}`)
    }
}

Template.webcam.onRendered(function () {
    this.attempt = 1
    checkMediaAvailable(this, 'video-audio')
})

Template.webcam.onDestroyed(function () {
    destroyVideoSource(this.find('video'))
})

Template.screenshare.onRendered(function () {
    this.attempt = 1
    checkMediaAvailable(this, 'screen')
})

Template.screenshare.onDestroyed(function () {
    destroyVideoSource(this.find('video'))
})

Template.remoteStream.onDestroyed(() => {
    if (!isModalOpen()) game.scene.getScene('WorldScene')?.enableMouse(true)
})

Template.remoteStream.onRendered(function () {
    const avatarDomElement = this.firstNode.querySelector('.avatar')
    if (!avatarDomElement) return

    avatarDomElement.onerror = (event) => {
        event.target.src = Meteor.settings.public.avatarFallback
    }
})

Template.remoteStream.helpers({
    mediaState() {
        const fields = { 'profile.shareAudio': 1, 'profile.shareVideo': 1 }
        const user = Meteor.users.findOne(this.remoteUser._id, { fields })

        return user?.profile || { shareAudio: false, shareVideo: false }
    },
    hasMainStream() {
        return this.remoteUser.main?.srcObject
    },
    hasScreenStream() {
        return this.remoteUser.screen?.srcObject
    },
    isWebcamFullScreen: () => {
        const modal = Session.get('modal')

        return modal?.template === 'fullScreenModal' && modal?.data?.template === 'webcam'
    },
    state() {
        const fields = { 'profile.userMediaError': 1 }
        const user = Meteor.users.findOne(this.remoteUser._id, { fields })
        if (!user) return 'user-error'
        if (user.profile.userMediaError) return 'media-error'

        return this.remoteUser.waitingCallAnswer ? 'calling' : 'connected'
    },
    name() {
        const fields = { 'profile.username': 1, 'profile.name': 1 }
        const user = Meteor.users.findOne(this.remoteUser._id, { fields })
        if (!user) return 'Guest'

        return user.profile.name || user.username || 'Guest'
    },
    avatar() {
        const fields = { 'profile.avatar': 1, 'profile.name': 1 }
        const user = Meteor.users.findOne(this.remoteUser._id, { fields })
        if (!user)
            return generateRandomAvatarURLForUser({
                _id: 'usr_a',
                profile: { name: 'Guest', avatar: 'cat' },
            })

        return generateRandomAvatarURLForUser(user)
    },
})

Template.remoteStream.events({
    'click .js-webcam': function (event) {
        event.preventDefault()

        Session.set('modal', {
            template: 'fullScreenModal',
            classes: 'modal-fit fullscreen-modal',
            screenType: 'webcam',
            remoteUser: this.remoteUser,
        })
    },
    'click .js-screenshare': function (event) {
        event.preventDefault()

        Session.set('modal', {
            template: 'fullScreenModal',
            classes: 'modal-fit fullscreen-modal',
            screenType: 'screenshare',
            remoteUser: this.remoteUser,
        })
    },
})
