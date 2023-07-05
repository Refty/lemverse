import { trackAttach, trackDetach } from './utils'

Template.remoteDesktopTrack.onCreated(function () {
    this.isMuted = new ReactiveVar(false)
})

Template.remoteDesktopTrack.onRendered(function () {
    this.autorun(() => trackAttach(this))
})

Template.remoteDesktopTrack.onDestroyed(function () {
    this.autorun(() => trackDetach(this))
})

Template.remoteDesktopTrack.events({
    'click .js-screenshare': function (event) {
        event.preventDefault()
        event.stopPropagation()
        const { track } = Template.currentData()

        if (!track) return
        Session.set('fullscreenTrackId', Session.get('fullscreenTrackId') === track.getId() ? null : track.getId())
    },
})

Template.remoteDesktopTrack.helpers({
    isMuted: () => Template.instance().isMuted.get(),
})
