import { trackAttach, trackDetach } from './utils'

Template.remoteFullscreen.onCreated(function () {
    this.isMuted = new ReactiveVar(false)
})

Template.remoteFullscreen.onRendered(function () {
    this.autorun(() => {
        const { track } = Template.currentData()
        trackAttach(this, `${track.getParticipantId()}-fullscreen`)
        trackAttach(this, `${track.getParticipantId()}-fullscreenBackground`)
    })
})

Template.remoteFullscreen.onDestroyed(function () {
    this.autorun(() => {
        const { track } = Template.currentData()
        trackDetach(this, `${track.getParticipantId()}-fullscreen`)
        trackDetach(this, `${track.getParticipantId()}-fullscreenBackground`)
    })
})
