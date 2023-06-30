import { getTrackType, updateTrack, attachLocalTracks, replaceLocalTrack } from './tracks/utils'

window.addEventListener('DOMContentLoaded', () => {
    jitsiMeetJS = undefined
    if (!Meteor.settings.public.meet) return

    const head = document.querySelector('head')

    const scriptLowLevel = document.createElement('script')
    scriptLowLevel.src = `https://${Meteor.settings.public.meet.serverURL}/libs/lib-jitsi-meet.min.js`
    head.appendChild(scriptLowLevel)

    scriptLowLevel.onload = () => {
        meetLowLevel = window.JitsiMeetJS
    }
})

Template.meetLowLevel.onCreated(function () {
    this.avatarURL = new ReactiveVar()
    this.connection = new ReactiveVar(undefined)
    this.localTracks = new ReactiveVar([])
    this.remoteTracks = new ReactiveVar({})

    this.connectionStarted = false
    this.room = undefined
    this.roomName = undefined
    this.usersIdsInCall = []

    this.autorun(() => {
        if (!Meteor.userId()) return

        const user = Meteor.user({ fields: { 'profile.avatar': 1 } })

        if (user) this.avatarURL.set(generateRandomAvatarURLForUser(user))
    })

    this.autorun(() => {
        const user = Meteor.user({ fields: { 'profile.videoRecorder': 1 } })

        if (!user || !meetLowLevel) return
        meetLowLevel
            .createLocalTracks({
                devices: ['video'],
                cameraDeviceId: user?.profile?.videoRecorder,
            })
            .then((tracks) => replaceLocalTrack(this, tracks[0]))
            .catch((err) => console.error('An error occured while creating local tracks', err))
    })

    this.autorun(() => {
        const user = Meteor.user({ fields: { 'profile.audioRecorder': 1 } })

        if (!user || !meetLowLevel) return
        meetLowLevel
            .createLocalTracks({
                devices: ['audio'],
                micDeviceId: user?.profile?.audioRecorder,
            })
            .then((tracks) => replaceLocalTrack(this, tracks[0]))
            .catch((err) => console.error('An error occured while creating local tracks', err))
    })

    window.addEventListener(eventTypes.onUsersComeCloser, (e) => onUsersComeCloser(e, this))
    window.addEventListener(eventTypes.onUsersMovedAway, (e) => onUsersMovedAway(e, this))
    window.addEventListener(eventTypes.onUserPropertyUpdated, (e) => onUserPropertyUpdated(e, this))
})

Template.meetLowLevel.onDestroyed(() => {
    window.removeEventListener(eventTypes.onUsersComeCloser, (e) => onUsersComeCloser(e, this))
    window.removeEventListener(eventTypes.onUsersMovedAway, (e) => onUsersMovedAway(e, this))
    window.removeEventListener(eventTypes.onUserPropertyUpdated, (e) => onUserPropertyUpdated(e, this))
})

Template.meetLowLevel.helpers({
    avatarURL() {
        return Template.instance().avatarURL.get()
    },
    isActive() {
        return Template.instance().connection.get() !== undefined && Template.instance().usersIdsInCall.length > 0
    },
    remoteTracks() {
        console.log(
            '🚀 ---------------------------------------------------------------------------------------------------------------------------------🚀'
        )
        console.log(
            '🚀 - file: meet-low-level.js:551 - remoteTracks - Template.instance().remoteTracks.get():',
            Template.instance().remoteTracks.get()
        )
        console.log(
            '🚀 ---------------------------------------------------------------------------------------------------------------------------------🚀'
        )
        // Check a better way to remove undefined tracks
        return Object.values(Template.instance().remoteTracks.get()).filter((track) => track.audio && track.camera)
    },
    isLocalVideoActive() {
        const user = Meteor.user({ fields: { 'profile.shareVideo': 1 } })

        if (!user || !user.profile) return
        return user.profile.shareVideo && Template.instance().localTracks.get().length > 0
    },
    isSharingScreen() {
        const localTracks = Template.instance().localTracks.get()

        return localTracks?.find((t) => t.getType() === 'video' && t.getVideoType() === 'desktop')
    },
    fullscreenTrack() {
        const fullscreenTrackId = Session.get('fullscreenTrackId')

        if (!Session.get('fullscreenTrackId')) return
        let fullscreenTrack
        const remoteTracks = Object.values(Template.instance().remoteTracks.get())

        remoteTracks?.forEach((tracks) => {
            const tracksMap = Object.values(tracks)
            tracksMap.forEach((track) => {
                if (track && typeof track !== 'string' && track.getId() === fullscreenTrackId) {
                    fullscreenTrack = track
                }
            })
        })

        return fullscreenTrack
    },
})

/*
 ** LowMeetJs
 */

const DOMAIN = '8x8.vc'
const getOptions = (roomName) => ({
    // Connection
    hosts: {
        domain: DOMAIN,
        muc: `conference.${DOMAIN}`,
        focus: `focus.${DOMAIN}`,
    },
    serviceUrl: `wss://${DOMAIN}/xmpp-websocket?room=${roomName}`,
    websocketKeepAliveUrl: `https://${DOMAIN}/_unlock?room=${roomName}`,

    // Enable Peer-to-Peer for 1-1 calls
    p2p: {
        enabled: false,
    },

    // Video quality / constraints
    constraints: {
        video: {
            height: {
                ideal: 720,
                max: 720,
                min: 180,
            },
            width: {
                ideal: 1280,
                max: 1280,
                min: 320,
            },
        },
    },
    channelLastN: 25,

    // Logging
    logging: {
        // Default log level
        defaultLogLevel: 'trace',

        // The following are too verbose in their logging with the default level
        'modules/RTC/TraceablePeerConnection.js': 'info',
        'modules/statistics/CallStats.js': 'info',
        'modules/xmpp/strophe.util.js': 'log',
    },

    // End marker, disregard
    __end: true,
})

const connect = async (template) => {
    console.log('Connection started')

    if (!template.connection.get()) {
        const options = getOptions(template.roomName)
        const user = Meteor.user({ fields: { 'profile.audioRecorder': 1, 'profile.videoRecorder': 1 } })

        meetLowLevel.init(options)
        meetLowLevel.setLogLevel(meetLowLevel.logLevels.ERROR)

        await meetLowLevel
            .createLocalTracks({
                devices: ['audio', 'video'],
                cameraDeviceId: user?.profile?.videoRecorder,
                micDeviceId: user?.profile?.audioRecorder,
            })
            .then((tracks) => {
                updateTrack('video', tracks)
                updateTrack('audio', tracks)
                attachLocalTracks(tracks)
                template.localTracks.set(tracks)
            })
            .catch((err) => console.error('An error occured while creating local tracks', err))

        const connection = new meetLowLevel.JitsiConnection(null, null, options)

        connection.addEventListener(meetLowLevel.events.connection.CONNECTION_ESTABLISHED, () =>
            onConnectionSuccess(template)
        )
        connection.addEventListener(meetLowLevel.events.connection.CONNECTION_FAILED, onConnectionFailed)
        connection.addEventListener(meetLowLevel.events.connection.CONNECTION_DISCONNECTED, () =>
            onConnectionDisconnected(template)
        )

        connection.connect()
        template.connection.set(connection)
    }
}

const disconnect = async (template) => {
    console.log('DISCONNECT')

    template.connectionStarted = false
    Meteor.users.update(Meteor.userId(), {
        $unset: { 'profile.meetRoomName': 1 },
    })

    if (template.room?.room) {
        try {
            template.room.leave()
        } catch (err) {
            console.log('Error during leaving', err)
        }
    }

    const connection = template.connection.get()

    connection.disconnect()
    connection.removeEventListener(meetLowLevel.events.connection.CONNECTION_ESTABLISHED, (template) =>
        onConnectionSuccess(template)
    )
    connection.removeEventListener(meetLowLevel.events.connection.CONNECTION_FAILED, onConnectionFailed)
    connection.removeEventListener(meetLowLevel.events.connection.CONNECTION_DISCONNECTED, () =>
        onConnectionDisconnected(template)
    )

    template.room = undefined
    template.connection.set(undefined)
}

/*
 **  LowMeetJs events listeners
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

const onConferenceJoined = (template) => {
    console.log('conference joined!')

    // If the user is the only user in the conference, disconnect from the conference.
    if (template.usersIdsInCall.length === 0) {
        disconnect(template)
    }
}

const onConferenceLeft = () => {
    console.log('conference left!')
}

const onUserJoined = (template, userId, participant) => {
    console.log('user joined!', userId)
    const _remoteTracks = template.remoteTracks.get()

    if (!_remoteTracks[userId]) _remoteTracks[userId] = {}
    _remoteTracks[userId].displayName = participant.getDisplayName()
    template.remoteTracks.set(_remoteTracks)
}

const onConnectionSuccess = (template) => {
    console.log('Successfully connected')
    const user = Meteor.user({ fields: { 'profile.name': 1 } })

    if (!template.room) {
        template.room = template.connection.get().initJitsiConference(template.roomName, {})

        const _localTracks = template.localTracks.get()

        // Add local tracks before joining
        for (let i = 0; i < _localTracks.length; i++) {
            template.room.addTrack(_localTracks[i])
        }

        // Setup event listeners
        template.room.on(meetLowLevel.events.conference.TRACK_ADDED, (track) => onTrackAdded(template, track))
        template.room.on(meetLowLevel.events.conference.TRACK_REMOVED, (track) => onTrackRemoved(template, track))
        template.room.on(meetLowLevel.events.conference.CONFERENCE_JOINED, () => onConferenceJoined(template))
        template.room.on(meetLowLevel.events.conference.CONFERENCE_LEFT, onConferenceLeft)
        template.room.on(meetLowLevel.events.conference.USER_JOINED, (userId, participant) =>
            onUserJoined(template, userId, participant)
        )
        template.room.on(meetLowLevel.events.conference.USER_LEFT, (id) => console.log('user left!', id))

        // Join
        template.room.setDisplayName(user?.profile?.name)
        template.room.join()
        template.room.setSenderVideoConstraint(720) // Send at most 720p
        template.room.setReceiverVideoConstraint(360) // Receive at most 360p for each participant
    }
}

const onConnectionFailed = () => {
    console.error('connection failed!')
}

const onConnectionDisconnected = (template) => {
    console.log('CONNECTION_DISCONNECTED')

    const _localTracks = template.localTracks.get()

    for (let i = 0; i < _localTracks.length; i++) {
        _localTracks[i].dispose()
    }

    template.localTracks.set([])
    template.remoteTracks.set({})
    template.usersInCall = []
    toggleUserProperty('shareScreen', false)
}

/*
 ** Events listeners
 */

const onUserPropertyUpdated = async (e, template) => {
    const { propertyName, propertyValue } = e.detail
    const localTracks = template.localTracks.get()

    if (!localTracks || localTracks.length === 0 || !propertyName) return

    if (propertyName === 'shareAudio') {
        updateTrack('audio', localTracks)
    } else if (propertyName === 'shareVideo') {
        updateTrack('video', localTracks)
    } else if (propertyName === 'shareScreen') {
        if (propertyValue) {
            await meetLowLevel.createLocalTracks({ devices: ['desktop'] }).then((tracks) => {
                const currentDesktopTrack = localTracks.find((t) => t.getVideoType() === 'desktop')
                const screenNode = document.querySelector('#video-screen-me')
                const track = tracks[0] // Since we just ask for desktop, we will only have one item

                track.attach(screenNode)

                // If it's the first time we share screen, we should add it to the conference
                if (!currentDesktopTrack) {
                    template.room.addTrack(track)
                } else {
                    // Otherwise, we should replace since because Meet will not trigger 'TRACK_REMOVED' when we dispose the desktop track
                    template.room.replaceTrack(currentDesktopTrack, track)
                }

                localTracks.push(track)
                template.localTracks.set(localTracks)
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

            template.localTracks.set(filteredLocalTracks)
        }
    }
}

const onUsersMovedAway = (e, template) => {
    const { users } = e.detail

    users.forEach((user) => (template.usersIdsInCall = _.without(template.usersIdsInCall, user._id)))

    if (template.connection.get() && template.usersIdsInCall.length === 0) {
        disconnect(template)
    }
}

const onUsersComeCloser = (e, template) => {
    const { users } = e.detail

    if (meetLowLevel && !template.connection.get() && !template.connectionStarted) {
        template.connectionStarted = true
        let roomName = users[0]?.profile?.meetRoomName

        if (!roomName) {
            usersIds = users.map((user) => user._id).concat(Meteor.userId())

            Meteor.call('computeMeetLowLevelRoomName', usersIds, (err, roomName) => {
                if (!roomName) {
                    lp.notif.error('Unable to load a room, please try later')
                    return
                }

                template.roomName = roomName
                connect(template)
            })
        } else {
            template.roomName = roomName

            Meteor.users.update(Meteor.userId(), {
                $set: { 'profile.meetRoomName': roomName },
            })
            connect(template)
        }
    }

    users.forEach((user) => {
        if (!template.usersIdsInCall.includes(user._id)) template.usersIdsInCall.push(user._id)
    })
}
