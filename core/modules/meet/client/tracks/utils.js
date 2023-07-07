import { meetLowLevel } from '../meet-low-level'

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

const toggleTrackMuteState = (track) => {
    if (!Meteor.userId() || !track) return

    const user = Meteor.user({ fields: { 'profile.shareAudio': 1, 'profile.shareVideo': 1 } })

    if (
        (track.getType() === 'audio' && user?.profile?.shareAudio) ||
        (track.getType() === 'video' && user?.profile?.shareVideo)
    ) {
        track.unmute()
    } else {
        track.mute()
    }
}

const attachLocalTrack = (track) => {
    if (track.getType() === 'video') {
        const videoNode = document.querySelector('#video-stream-me')
        track.attach(videoNode)
    }
}

const detachLocalTracks = (tracks) => {
    tracks.forEach((track) => {
        if (track.getType() === 'video') {
            const videoNode = document.querySelector('#video-stream-me')
            track.detach(videoNode)
        }
    })
}

const replaceLocalTrack = (template, newTrack) => {
    const localTracks = template.localTracks.get()
    console.log('🚀 ----------------------------------------------------------------------🚀')
    console.log('🚀 - file: utils.js:55 - replaceLocalTrack - localTracks:', localTracks)
    console.log('🚀 ----------------------------------------------------------------------🚀')

    if (localTracks) {
        template.localTracks.set(
            localTracks.map((track) => {
                console.log('🚀 --------------------------------------------------------🚀')
                console.log('🚀 - file: utils.js:56 - localTracks.map - track:', track)
                console.log('🚀 --------------------------------------------------------🚀')
                if (track.getType() === newTrack.getType()) {
                    // Replace old tracks by the new one
                    meetLowLevel.room.replaceTrack(track, newTrack)
                    // track.dispose().then(() => console.log('ON DISPOSE'))
                    attachLocalTrack(newTrack)
                    return newTrack
                }
                return track
            })
        )
    }
}

const trackAttach = (template, trackId) => {
    const { track } = Template.currentData() // Do not replace it to use 'template' props, need use global 'Template' to get the track

    if (!track) return
    const el = document.getElementById(trackId || getTrackId(track))

    if (template.isMuted) {
        template.isMuted.set(track.isMuted())
    }

    track.addEventListener(jitsiMeetJS.events.track.TRACK_MUTE_CHANGED, () => updateTrackMuteState(track, template))

    if (!el) return
    track.attach(el)
}

const trackDetach = (template, trackId) => {
    const { track } = Template.currentData()

    if (!track) return
    const el = document.getElementById(trackId || getTrackId(track))

    track.removeEventListener(jitsiMeetJS.events.track.TRACK_MUTE_CHANGED, () => updateTrackMuteState(track, template))

    if (!el) return
    track.detach(el)
}

export { trackAttach, trackDetach, getTrackType, toggleTrackMuteState, attachLocalTrack, replaceLocalTrack }
