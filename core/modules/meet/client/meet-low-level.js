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

const getTrackId = (track) => `${track.getParticipantId()}-${getTrackType(track)}`

const getTrackType = (track) => {
    if (track.getType() === 'audio') return 'audio'
    else if (track.getType() === 'video') return track.getVideoType()
}

/*
 **  MeetJs events
 */
const onTrackAdded = (template, track) => {
    // Since we attach local tracks separately, we do not need attach it again
    if (track.isLocal()) return

    const participantId = track.getParticipantId()
    const _remoteTracks = template.remoteTracks.get()

    if (!_remoteTracks[participantId]) _remoteTracks[participantId] = {}

    if (track.getType() === 'video') {
        // When receiving a 'desktop' track, Jitsi doesn't immediately set the correct type, leading to confusion with our own tracks.
        // Initially, a 'desktop' track is classified as a 'camera' type, but after a few seconds, it is eventually updated to a 'desktop' track type.
        // This inconsistency is quite frustrating, and since we haven't found a suitable solution, it's better to introduce a timeout before setting the track type to 'video'.
        // Cf: https://community.jitsi.org/t/identifying-new-track-as-desktop/118232/2

        setTimeout(() => {
            _remoteTracks[participantId][getTrackType(track)] = track
            template.remoteTracks.set(_remoteTracks)
        }, 1000)
    } else {
        _remoteTracks[participantId][getTrackType(track)] = track
        template.remoteTracks.set(_remoteTracks)
    }
}

const onTrackRemoved = (template, track) => {
    const _remoteTracks = template.remoteTracks.get()
    const participantId = track.getParticipantId()

    if (_remoteTracks[participantId]) {
        _remoteTracks[participantId][getTrackType(track)] = null

        if (_remoteTracks[participantId].length === 0) delete _remoteTracks[participantId]
        template.remoteTracks.set(_remoteTracks)
    }
}

const onConferenceJoined = () => {
    console.log('conference joined!')
}

const onConferenceLeft = () => {
    console.log('conference left!')
}

const onConnectionSuccess = (template) => {
    console.log('Successfully connected')
    template.room = template.connection.get().initJitsiConference(template.roomName, {})
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
    template.room.on(meetJs.events.conference.USER_LEFT, (id) => console.log('user left!', id))

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
const trackAttach = (template) => {
    const { track } = Template.currentData() // Do not replace it to use 'template' props, need use global 'Template' to get the track

    if (!track) return
    const el = document.getElementById(getTrackId(track))

    if (template.isMuted) {
        template.isMuted.set(track.isMuted())
    }

    track.addEventListener(meetJs.events.track.TRACK_MUTE_CHANGED, (track) => {
        if (template.isMuted) {
            template.isMuted.set(track.isMuted())
        }
    })

    if (!el) return
    track.attach(el)
}

const trackDetach = () => {
    const { track } = Template.currentData()

    if (!track) return
    const el = document.getElementById(getTrackId(track))

    if (!el) return
    track.detach(el)
}

Template.remoteVideoTrack.onCreated(function () {
    this.isMuted = new ReactiveVar(false)
})
Template.remoteAudioTrack.onCreated(function () {
    this.isMuted = new ReactiveVar(false)
})
Template.remoteDesktopTrack.onCreated(function () {
    this.isMuted = new ReactiveVar(false)
})

Template.remoteVideoTrack.onRendered(function () {
    this.autorun(() => trackAttach(this))
})
Template.remoteAudioTrack.onRendered(function () {
    this.autorun(() => trackAttach(this))
})
Template.remoteDesktopTrack.onRendered(function () {
    this.autorun(() => trackAttach(this))
})

Template.remoteVideoTrack.onDestroyed(function () {
    this.autorun(() => trackDetach())
})
Template.remoteAudioTrack.onDestroyed(function () {
    this.autorun(() => trackDetach())
})
Template.remoteDesktopTrack.onDestroyed(function () {
    this.autorun(() => trackDetach())
})

Template.remoteVideoTrack.helpers({
    isMuted: () => Template.instance().isMuted.get(),
    avatar: () =>
        generateRandomAvatarURLForUser({
            _id: 'usr_a',
            profile: { name: 'Guest', avatar: 'cat' },
        }),
})
Template.remoteAudioTrack.helpers({
    isMuted: () => Template.instance().isMuted.get(),
})
Template.remoteDesktopTrack.helpers({
    isMuted: () => Template.instance().isMuted.get(),
})

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
    tracks.forEach((track) => {
        if (track.getType() === 'video') {
            let videoNode = document.querySelector('#video-stream-me')
            track.attach(videoNode)
        } else if (track.getType() === 'audio') {
            let audioNode = document.querySelector('#audio-stream-me')
            // tracks[i].attach(audioNode)
        }
    })

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

    template.connection.set(
        new meetJs.JitsiConnection(null, null, {
            hosts: {
                domain: DOMAIN,
                muc: `conference.${DOMAIN}`,
                focus: `focus.${DOMAIN}`,
            },
            serviceUrl: `https://${DOMAIN}/http-bind?room=${'laa'}`,
            // serviceUrl: `wss://8x8.vc/xmpp-websocket?room=${template.roomName}`,
            // websocketKeepAliveUrl: `https://8x8.vc/_unlock?room=${template.roomName}`,

            p2p: {
                enabled: false,
            },

            // logging: {
            //     // Default log level
            //     defaultLogLevel: 'trace',

            //     // The following are too verbose in their logging with the default level
            //     'modules/RTC/TraceablePeerConnection.js': 'info',
            //     'modules/statistics/CallStats.js': 'info',
            //     'modules/xmpp/strophe.util.js': 'log',
            // },
        })
    )

    template.connection
        .get()
        .addEventListener(meetJs.events.connection.CONNECTION_ESTABLISHED, () => onConnectionSuccess(template))
    template.connection.get().addEventListener(meetJs.events.connection.CONNECTION_FAILED, onConnectionFailed)

const disconnect = async (template) => {
    console.log('DISCONNECT')

    await template.room.leave()

    template.connection.removeEventListener(meetJs.events.connection.CONNECTION_ESTABLISHED, onConnectionSuccess)
    template.connection.removeEventListener(meetJs.events.connection.CONNECTION_FAILED, onConnectionFailed)
    template.connection.removeEventListener(meetJs.events.connection.CONNECTION_DISCONNECTED, disconnect)

    template.connection.get().connect()
}

    for (let i = 0; i < _localTracks.length; i++) {
        _localTracks[i].dispose()
    }

    template.localTracks.set([])
    template.remoteTracks.set({})
    Session.set('meetIsConnected', false)

    await template.connection.get().disconnect()
    console.log('ON UNDEFINED')
}

Template.meetLowLevel.onCreated(function () {
    this.localTracks = new ReactiveVar([])
    this.remoteTracks = new ReactiveVar({})
    this.avatarURL = new ReactiveVar()

    this.roomName = undefined
    this.connection = new ReactiveVar(undefined)
    this.room = undefined

    this.autorun(() => {
        if (!Meteor.userId()) return

        const user = Meteor.user({ fields: { 'profile.avatar': 1 } })

        if (user) this.avatarURL.set(generateRandomAvatarURLForUser(user))
    })

    window.addEventListener(eventTypes.onUsersComeCloser, async (e) => {
        if (!this.connection) await connect(this)
    })

    window.addEventListener(eventTypes.onUsersMovedAway, async (e) => {
        if (this.connection) {
            await disconnect(this)
            this.room = undefined
            this.connection.set(undefined)
        }
    })

    window.addEventListener(eventTypes.onUserPropertyUpdated, async (e) => {
        const { propertyName, propertyValue } = e.detail
        const localTracks = this.localTracks.get()

        if (!localTracks || localTracks.length === 0 || !propertyName) return

        if (propertyName === 'shareAudio') {
            updateTrack('audio', localTracks)
        } else if (propertyName === 'shareVideo') {
            updateTrack('video', localTracks)
        } else if (propertyName === 'shareScreen') {
            if (propertyValue) {
                await meetJs.createLocalTracks({ devices: ['desktop'] }).then((tracks) => {
                    const currentDesktopTrack = localTracks.find((t) => t.getVideoType() === 'desktop')
                    const screenNode = document.querySelector('#video-screen-me')
                    const track = tracks[0] // Since we just ask for desktop, we will only have one item

                    track.attach(screenNode)

                    // If it's the first time we share screen, we should add it to the conference
                    if (!currentDesktopTrack) {
                        this.room.addTrack(track)
                    } else {
                        // Otherwise, we should replace since because Meet will not trigger 'TRACK_REMOVED' when we dispose the desktop track
                        this.room.replaceTrack(currentDesktopTrack, track)
                    }

                    localTracks.push(track)
                    this.localTracks.set(localTracks)
                })
            } else {
                let filteredLocalTracks = localTracks.filter((track) => {
                    // While we remove the desktop track, we dispose it at the same time
                    if (track.getVideoType() === 'desktop') {
                        track.dispose()
                        return false
                    }
                    return true
                })

                this.localTracks.set(filteredLocalTracks)
            }
        }
    })
})

Template.meetLowLevel.helpers({
    avatarURL() {
        return Template.instance().avatarURL.get()
    },
    isActive() {
        return Template.instance().connection.get() !== undefined
    },
    remoteTracks() {
        return Object.values(Template.instance().remoteTracks.get())
    },
    isLocalVideoActive() {
        const user = Meteor.user({ fields: { 'profile.shareVideo': 1 } })

        return user.profile?.shareVideo && Template.instance().localTracks.get().length > 0
    },
    isSharingScreen() {
        const localTracks = Template.instance().localTracks.get()

        return localTracks?.find((t) => t.getType() === 'video' && t.getVideoType() === 'desktop')
    },
})
