import { trackAttach, trackDetach } from './utils'

Template.remoteAudioTrack.onCreated(function () {
    this.isMuted = new ReactiveVar(false)
})

Template.remoteAudioTrack.onRendered(function () {
    this.autorun(() => trackAttach(this))
})

Template.remoteAudioTrack.onDestroyed(function () {
    this.autorun(() => trackDetach(this))
})

Template.remoteAudioTrack.helpers({
    isMuted: () => Template.instance().isMuted.get(),
})
