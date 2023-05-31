let meetJs

window.addEventListener('load', () => {
    if (!Meteor.settings.public.meet) return

    const head = document.querySelector('head')

    const scriptLowLevel = document.createElement('script')
    scriptLowLevel.src = `https://${Meteor.settings.public.meet.serverURL}/libs/lib-jitsi-meet.min.js`
    head.appendChild(scriptLowLevel)

    scriptLowLevel.onload = () => {
        meetJs = window.JitsiMeetJS
        meetJs.init()
    }
})

/*
 **  MeetJs events
 */
const onTrackAdded = (template, track) => {
    // Since we attach local tracks separately, we do not need attach it again
    if (track.isLocal()) return

    const _remoteTracks = template.remoteTracks.get()

    _remoteTracks.push(track)
    template.remoteTracks.set(_remoteTracks)
}

const onTrackRemoved = (template, track) => {
    const _remoteTracks = _.without(template.remoteTracks.get(), track)
    template.remoteTracks.set(_remoteTracks)
}

const onConferenceJoined = () => {
    console.log('conference joined!')
}

const onConferenceLeft = () => {
    console.log('conference left!')
}

const onConnectionSuccess = (template) => {
    template.room = template.connection.initJitsiConference(template.roomName, {})
    const _localTracks = template.localTracks.get()

    // Add local tracks before joining
    for (let i = 0; i < _localTracks.length; i++) {
        template.room.addTrack(_localTracks[i])
    }

    // Setup event listeners
    template.room.on(meetJs.events.conference.TRACK_ADDED, (track) => onTrackAdded(template, track))
    template.room.on(meetJs.events.conference.TRACK_REMOVED, (track) => onTrackRemoved(template, track))
    template.room.on(meetJs.events.conference.CONFERENCE_JOINED, onConferenceJoined)
    template.room.on(meetJs.events.conference.CONFERENCE_LEFT, onConferenceLeft)
    template.room.on(meetJs.events.conference.USER_JOINED, (id) => console.log('user joined!', id))
    template.room.on(meetJs.events.conference.USER_LEFT, (id) => onsole.log('user left!', id))

    // Join
    template.room.join()
    template.room.setSenderVideoConstraint(720) // Send at most 720p
    template.room.setReceiverVideoConstraint(360) // Receive at most 360p for each participant
}

const onConnectionFailed = () => {
    console.error('connection failed!')
}

/*
 ** Video/Audio Track templates
 */
const trackAttach = () => {
    const track = Template.currentData()
    const el = $(`#${track.getId()}`)[0]
    track.attach(el)
}

const trackDetach = () => {
    const track = Template.currentData()
    track.detach($(`#${track.getId()}`)[0])
}

Template.remoteAudioTrack.onRendered(function () {
    this.autorun(function () {
        trackAttach()
    })
})

Template.remoteVideoTrack.onRendered(function () {
    this.autorun(function () {
        trackAttach()
    })
})

Template.remoteAudioTrack.onDestroyed(trackDetach)
Template.remoteVideoTrack.onDestroyed(trackDetach)

/*
 ** MeetLowLevel templates
 */

const updateTrack = (type, tracks) => {
    if (!Meteor.userId()) return

    const user = Meteor.user({ fields: { 'profile.shareAudio': 1, 'profile.shareVideo': 1 } })
    const track = tracks.find((t) => t.getType() === type)

    if (!track) return
    if (type === 'audio') user?.profile?.shareAudio ? track.unmute() : track.mute()
    else if (type === 'video') user?.profile?.shareVideo ? track.unmute() : track.mute()
}

const onLocalTracks = (template, tracks) => {
    for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].getType() === 'video') {
            let videoNode = document.querySelector('#video-stream-me')
            tracks[i].attach(videoNode)
        } else {
            let audioNode = document.querySelector('#audio-stream-me')
            // tracks[i].attach(audioNode)
        }
    }

    template.localTracks.set(tracks)
}

const connect = async (template, name = Meteor.settings.public.meet.roomDefaultName) => {
    console.log('Connection started')

    template.roomName = 'laaaee'
    meetJs.setLogLevel(meetJs.logLevels.ERROR)

    await meetJs.createLocalTracks({ devices: ['audio', 'video'] }).then((tracks) => {
        updateTrack('video', tracks)
        updateTrack('audio', tracks)

        onLocalTracks(template, tracks)
    })

    template.connection = new meetJs.JitsiConnection(null, null, {
        hosts: {
            domain: `8x8.vc`,
            muc: `conference.8x8.vc`,
            focus: `focus.8x8.vc`,
        },
        serviceUrl: `wss://8x8.vc/xmpp-websocket?room=${template.roomName}`,
        websocketKeepAliveUrl: `https://8x8.vc/_unlock?room=${template.roomName}`,

        p2p: {
            enabled: true,
        },

        logging: {
            // Default log level
            defaultLogLevel: 'trace',

            // The following are too verbose in their logging with the default level
            'modules/RTC/TraceablePeerConnection.js': 'info',
            'modules/statistics/CallStats.js': 'info',
            'modules/xmpp/strophe.util.js': 'log',
        },
    })

    template.connection.addEventListener(meetJs.events.connection.CONNECTION_ESTABLISHED, () =>
        onConnectionSuccess(template)
    )
    template.connection.addEventListener(meetJs.events.connection.CONNECTION_FAILED, onConnectionFailed)
    template.connection.addEventListener(meetJs.events.connection.CONNECTION_DISCONNECTED, () =>
        console.log('Connection disconnected')
    )

    template.connection.connect()
}

const disconnect = async (template) => {
    console.log('DISCONNECT')

    template.connection.removeEventListener(meetJs.events.connection.CONNECTION_ESTABLISHED, onConnectionSuccess)
    template.connection.removeEventListener(meetJs.events.connection.CONNECTION_FAILED, onConnectionFailed)
    template.connection.removeEventListener(meetJs.events.connection.CONNECTION_DISCONNECTED, disconnect)

    const _localTracks = template.localTracks.get()

    for (let i = 0; i < _localTracks.length; i++) {
        _localTracks[i].dispose()
    }

    template.localTracks.set([])
    template.remoteTracks.set([])

    return await template.connection.disconnect()
}

Template.meetLowLevel.onCreated(function () {
    this.localTracks = new ReactiveVar([])
    this.remoteTracks = new ReactiveVar([])
    this.roomName = ''
    this.connection = undefined
    this.room = undefined

    window.addEventListener(eventTypes.onUsersComeCloser, async (e) => {
        if (!this.connection) await connect(this)
    })

    window.addEventListener(eventTypes.onUsersMovedAway, async (e) => {
        if (this.connection) {
            await disconnect(this)
            this.connection = undefined
        }
    })

    window.addEventListener(eventTypes.onUserPropertyUpdated, (e) => {
        const { updatedProperty } = e.detail
        const localTracks = this.localTracks.get()

        if ((!localTracks && localTracks.length === 0) || !updatedProperty) return

        if (updatedProperty === 'shareAudio') {
            updateTrack('audio', localTracks)
        } else if (updatedProperty === 'shareVideo') {
            updateTrack('video', localTracks)
        }
    })
})

Template.meetLowLevel.helpers({
    active() {
        return Template.instance().remoteTracks.get().length > 0
    },
    videoActive() {
        return Template.instance().localTracks.get().length > 0
    },
    remoteTracks() {
        return Template.instance().remoteTracks.get()
    },
})
