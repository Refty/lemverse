import { trackAttach, trackDetach } from './utils'

Template.remoteVideoTrack.onCreated(function () {
    this.isMuted = new ReactiveVar(false)
})

Template.remoteVideoTrack.onRendered(function () {
    this.autorun(() => trackAttach(this))
})

Template.remoteVideoTrack.onDestroyed(function () {
    this.autorun(() => trackDetach(this))
})

Template.remoteVideoTrack.events({
    'click .webcam': function (event) {
        event.preventDefault()
        event.stopPropagation()
        const { track } = Template.currentData()

        if (!track) return
        Session.set('fullscreenTrackId', Session.get('fullscreenTrackId') === track.getId() ? null : track.getId())
    },
})

Template.remoteVideoTrack.helpers({
    isMuted: () => Template.instance().isMuted.get(),
    avatar: () =>
        generateRandomAvatarURLForUser({
            _id: 'usr_a',
            profile: { name: 'Guest', avatar: 'cat' },
        }),
})
