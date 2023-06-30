const updateTrackMuteState = (track, template) => {
    if (template.isMuted) {
        template.isMuted.set(track.isMuted())
    }
}

const getTrackType = (track) => {
    if (track.getType() === 'audio') return 'audio'
    else if (track.getType() === 'video') return track.getVideoType()
}

const getTrackId = (track) => `${track.getParticipantId()}-${getTrackType(track)}`

const updateTrack = (type, tracks) => {
    if (!Meteor.userId()) return

    const user = Meteor.user({ fields: { 'profile.shareAudio': 1, 'profile.shareVideo': 1 } })
    const track = tracks.find((t) => t.getType() === type)

    if (!track) return
    if (type === 'audio') user?.profile?.shareAudio ? track.unmute() : track.mute()
    else if (type === 'video') user?.profile?.shareVideo ? track.unmute() : track.mute()
}

const attachLocalTracks = (tracks) => {
    tracks.forEach((track) => {
        if (track.getType() === 'video') {
            const videoNode = document.querySelector('#video-stream-me')
            track.attach(videoNode)
        }
    })
}

const replaceLocalTrack = (template, newTrack) => {
    const localTracks = template.localTracks.get()

    if (localTracks) {
        template.localTracks.set(
            localTracks.map((track) => {
                if (track.getType() === newTrack.getType()) {
                    // Replace old tracks by the new one
                    template.room.replaceTrack(track, newTrack)
                    return newTrack
                }
                return track
            })
        )
        attachLocalTracks([newTrack])
    }
}

const trackAttach = (template, trackId) => {
    const { track } = Template.currentData() // Do not replace it to use 'template' props, need use global 'Template' to get the track

    if (!track) return
    const el = document.getElementById(trackId || getTrackId(track))

    if (template.isMuted) {
        template.isMuted.set(track.isMuted())
    }

    track.addEventListener(meetLowLevel.events.track.TRACK_MUTE_CHANGED, () => updateTrackMuteState(track, template))

    if (!el) return
    track.attach(el)
}

const trackDetach = (trackId) => {
    const { track } = Template.currentData()

    if (!track) return
    const el = document.getElementById(trackId || getTrackId(track))

    track.removeEventListener(meetLowLevel.events.track.TRACK_MUTE_CHANGED, () => updateTrackMuteState(track, template))

    if (!el) return
    track.detach(el)
}

export { trackAttach, trackDetach, getTrackType, updateTrack, attachLocalTracks, replaceLocalTrack }
