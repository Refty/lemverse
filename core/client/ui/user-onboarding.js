import { isMobile } from '../helpers'

const ONBOARDING_LAST_STEP = 4
const keyboard = ['z', 'q', 's', 'd', 'w', 'a', 'down', 'right', 'left', 'up']
let interval

const getDirectionFromKey = (key) => {
    switch (key) {
        case 'KeyW':
        case 'ArrowUp':
            return 'up'
        case 'ArrowDown':
        case 'KeyS':
            return 'down'
        case 'KeyA':
        case 'ArrowLeft':
            return 'left'
        case 'KeyD':
        case 'ArrowRight':
            return 'right'
        default:
            return null
    }
}

const updateSettingsStream = async (template) => {
    const constraints = userStreams.getStreamConstraints(streamTypes.main)
    constraints.forceNew = true

    const stream = await userStreams.requestUserMedia(constraints)
    if (!stream) {
        lp.notif.error(`unable to get a valid stream`)
        return
    } else {
        Session.set('streamAccepted', true)
    }

    const { mics, cams } = await userStreams.enumerateDevices()

    template.audioRecorders.set(mics)
    template.videoRecorders.set(cams)

    const video = document.querySelector('#js-video-preview')
    video.srcObject = stream
    video.onloadedmetadata = () => video.play()

    peer.updatePeersStream(stream, streamTypes.main)

    if (interval) clearInterval(interval)
    interval = userStreams.trackSound(stream, (audioMeter) => template.audioMeter.set(audioMeter))
}

const bindKeyboards = () => {
    keyboard.forEach((key) => {
        hotkeys(key, { keyup: true }, (event) => {
            if (event.repeat) return

            const learnedDirections = Session.get('learnedDirections') || []

            if (event.type === 'keydown') {
                const direction = getDirectionFromKey(event.code)

                if (!learnedDirections.includes(direction)) learnedDirections.push(direction)

                Session.set('learnedDirections', learnedDirections)
                Session.set('pressedKeyboard', event.code)
            } else {
                Session.set('pressedKeyboard', null)
            }
        })
    })
}

const finishOnboarding = () => {
    Meteor.users.update(Meteor.userId(), { $unset: { 'profile.guest': true } })

    lp.notif.success('Enjoy 🚀')
}

Template.permissionsModal.events({
    'click .js-dismiss-modal': function () {
        toggleModal('permissionsModal', 'fit-modal')
    },
})

Template.permissionsModal.helpers({
    browserName: () => {
        const userAgent = navigator.userAgent

        if (userAgent.match(/chrome|chromium|crios/i))
            return "chrome"
        if (userAgent.match(/safari/i))
            return "safari"
        return "other"
    },
})

Template.userOnboarding.onCreated(function () {
    bindKeyboards()

    this.audioRecorders = new ReactiveVar([])
    this.videoRecorders = new ReactiveVar([])
    this.audioMeter = new ReactiveVar([])
    this.deviceChangerListener = () => updateSettingsStream(this)
    updateSettingsStream(this)

    navigator.mediaDevices.addEventListener('devicechange', this.deviceChangerListener)
    Session.set('isOnboarding', true)
})

Template.userOnboarding.onDestroyed(function () {
    Session.set('isOnboarding', null)
})

Template.userOnboarding.events({
    'click .button': function () {
        const onboardingStep = Session.get('onboardingStep') || 1

        if (onboardingStep === (!isMobile() ? ONBOARDING_LAST_STEP : ONBOARDING_LAST_STEP - 1))
            return finishOnboarding()
        if (onboardingStep === 1) {
            userStreams.destroyStream(streamTypes.main)
            clearInterval(interval)
            navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangerListener)
        }
        Session.set('onboardingStep', onboardingStep + 1)
    },
    'click .source-button.audio': function (event, templateInstance) {
        event.preventDefault()
        event.stopPropagation()
        if (Session.get('streamAccepted')) {
            toggleUserProperty('shareAudio')
        } else {
            updateSettingsStream(templateInstance)
        }
    },
    'click .source-button.video': function (event, templateInstance) {
        event.preventDefault()
        event.stopPropagation()
        if (Session.get('streamAccepted')) {
            toggleUserProperty('shareVideo')
        } else {
            updateSettingsStream(templateInstance)
        }
    },
    'change .js-mic-select': function (event, templateInstance) {
        Meteor.users.update(Meteor.userId(), {
            $set: { 'profile.audioRecorder': event.target.value },
        })
        updateSettingsStream(templateInstance)
    },
    'change .js-cam-select': function (event, templateInstance) {
        Meteor.users.update(Meteor.userId(), {
            $set: { 'profile.videoRecorder': event.target.value },
        })
        updateSettingsStream(templateInstance)
    },
})

Template.userOnboarding.helpers({
    step: () => Session.get('onboardingStep') || 1,
    streamAccepted: () => Session.get('streamAccepted') || false,
    audioRecorders: () => Template.instance().audioRecorders.get(),
    videoRecorders: () => Template.instance().videoRecorders.get(),
    audioMeter: () => Template.instance().audioMeter.get(),
    arrayOfMeter: () => Array.from({ length: 8 }),
    hasLearnedDirection: (key) => {
        const learnedDirections = Session.get('learnedDirections') || []
        return learnedDirections.includes(getDirectionFromKey(key))
    },
    hasLearnedAllDirections: () => {
        const learnedDirections = Session.get('learnedDirections') || []
        return learnedDirections.length >= 1
    },
    direction: () => getDirectionFromKey(Session.get('pressedKeyboard')),
    getAvatarUrl: () => {
        const user = Meteor.user()
        if (!user) return []

        return `/api/files/${
            Object.keys(charactersParts)
                .filter((part) => user.profile[part])
                .map((part) => Characters.findOne(user.profile[part]))[0].fileId
        }`
    },
    isMobile: () => isMobile(),
})
