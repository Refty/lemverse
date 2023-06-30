import { screenShareDefaultConfig } from '../user-streams'

let interval

const updateSettingsStream = async (template) => {
    const constraints = userStreams.getStreamConstraints(streamTypes.main)
    constraints.forceNew = true

    const stream = await userStreams.requestUserMedia(constraints)
    if (!stream) {
        lp.notif.error(`unable to get a valid stream`)
        return
    }

    const { mics, cams } = await userStreams.enumerateDevices()
    template.audioRecorders.set(mics)
    template.videoRecorders.set(cams)

    const video = document.querySelector('#js-video-preview')
    video.srcObject = stream
    video.onloadedmetadata = () => video.play()

    if (interval) clearInterval(interval)
    interval = userStreams.trackSound(stream, (audioMeter) => template.audioMeter.set(audioMeter))
}

Template.settingsMedias.onCreated(function () {
    this.audioRecorders = new ReactiveVar([])
    this.videoRecorders = new ReactiveVar([])
    this.audioMeter = new ReactiveVar([])
    this.deviceChangerListener = () => updateSettingsStream(this)
    updateSettingsStream(this)

    navigator.mediaDevices.addEventListener('devicechange', this.deviceChangerListener)
})

Template.settingsMedias.onDestroyed(function () {
    if (userProximitySensor.nearUsersCount() === 0) userStreams.destroyStream(streamTypes.main)
    navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangerListener)
})

Template.settingsMedias.events({
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
    'change .js-screen-framerate': function (event) {
        Meteor.users.update(Meteor.userId(), {
            $set: { 'profile.screenShareFrameRate': +event.target.value },
        })
        if (userStreams.streams.screen.instance) {
            const constraints = userStreams.getStreamConstraints(streamTypes.screen)
            userStreams.applyConstraints(streamTypes.screen, 'video', constraints)
        }
    },
})

Template.settingsMedias.helpers({
    frameRate() {
        return (
            Meteor.user({ 'profile.screenShareFrameRate': 1 }).profile.screenShareFrameRate ||
            screenShareDefaultConfig.defaultFrameRate
        )
    },
    audioRecorders() {
        return Template.instance().audioRecorders.get()
    },
    videoRecorders() {
        return Template.instance().videoRecorders.get()
    },
    arrayOfMeter: () => Array.from({ length: 8 }),
    audioMeter: () => Template.instance().audioMeter.get(),
})
