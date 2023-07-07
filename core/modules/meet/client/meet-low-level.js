import { getTrackType, toggleTrackMuteState, attachLocalTrack, replaceLocalTrack } from './tracks/utils'

window.addEventListener('DOMContentLoaded', () => {
    jitsiMeetJS = undefined
    if (!Meteor.settings.public.meet) return

    const head = document.querySelector('head')

    const scriptLowLevel = document.createElement('script')
    scriptLowLevel.src = `https://${Meteor.settings.public.meet.serverURL}/libs/lib-jitsi-meet.min.js`
    head.appendChild(scriptLowLevel)

    scriptLowLevel.onload = () => {
        jitsiMeetJS = window.JitsiMeetJS
    }
})

Template.meetLowLevel.onCreated(function () {
    this.avatarURL = new ReactiveVar()
    this.connection = new ReactiveVar(undefined)
    this.localTracks = new ReactiveVar([])
    this.remoteTracks = new ReactiveVar({})
    meetLowLevel.template = this

    this.autorun(() => {
        if (!Meteor.userId()) return
        const user = Meteor.user({ fields: { 'profile.avatar': 1 } })
        if (user) this.avatarURL.set(generateRandomAvatarURLForUser(user))
    })

    this.autorun(() => {
        const user = Meteor.user({ fields: { 'profile.videoRecorder': 1, 'profile.shareVideo': 1 } })
        console.log('🚀 ------------------------------------------------------------🚀')
        console.log('🚀 - file: meet-low-level.js:33 - this.autorun - user:', user)
        console.log('🚀 ------------------------------------------------------------🚀')

        console.log('AUTORUN VIDEO')
        if (!jitsiMeetJS || !this.connection.get()) return

        const localTracks = this.localTracks.get()
        const videoTrack = localTracks?.find(
            (track) => track.getType() === 'video' && track.getVideoType() === 'camera'
        )

        // Create video track if it doesn't exist yet
        if (
            (!videoTrack || (videoTrack && videoTrack.getDeviceId() !== user?.profile?.videoRecorder)) &&
            user?.profile?.shareVideo
        ) {
            console.log('CREATE IT')
            createLocalTrack('video', { cameraDeviceId: user?.profile?.videoRecorder }).then((newTrack) => {
                if (!videoTrack) {
                    console.log('ADD IT')
                    user?.profile?.shareVideo ? newTrack.unmute() : newTrack.mute()
                    attachLocalTrack(newTrack)

                    meetLowLevel.room.addTrack(newTrack)
                    this.localTracks.set([...localTracks, newTrack])
                } else if (videoTrack.getDeviceId() !== user?.profile?.videoRecorder) {
                    console.log('REPLACE IT')
                    // replaceLocalTrack(this, newTrack)

                    this.template.localTracks.set(
                        this.localTracks.get().map((mapTrack) => {
                            console.log('🚀 --------------------------------------------------------🚀')
                            console.log('🚀 - file: utils.js:56 - localTracks.map - track:', track)
                            console.log('🚀 --------------------------------------------------------🚀')
                            if (mapTrack.getType() === newTrack.getType()) {
                                // Replace old tracks by the new one
                                meetLowLevel.room.replaceTrack(mapTrack, newTrack)
                                // track.dispose().then(() => console.log('ON DISPOSE'))
                                attachLocalTrack(newTrack)
                                return newTrack
                            }

                            return mapTrack
                        })
                    )
                }
            })
            // Else if current video track device differs from the new settings, replace it
        } else if (videoTrack) {
            console.log('TOGGLE IT')
            if (user?.profile?.shareVideo && videoTrack.isMuted()) {
                console.log('UNMUTE IT')
                videoTrack.unmute()
            } else if (!user?.profile?.shareVideo && !videoTrack.isMuted()) {
                console.log('MUTE IT')
                videoTrack.mute()
            }
        }
    })

    this.autorun(() => {
        const user = Meteor.user({ fields: { 'profile.audioRecorder': 1, 'profile.shareAudio': 1 } })

        console.log('🚀 ------------------------------------------------------------🚀')
        console.log('🚀 - file: meet-low-level.js:33 - this.autorun - user:', user)
        console.log('🚀 ------------------------------------------------------------🚀')

        console.log('AUTORUN AUDIO')
        if (!jitsiMeetJS || !this.connection.get()) return

        const localTracks = this.localTracks.get()
        const audioTrack = localTracks?.find((track) => track.getType() === 'audio')

        // Create audio track if it doesn't exist yet
        if (
            (!audioTrack || (audioTrack && audioTrack.getDeviceId() !== user?.profile?.audioRecorder)) &&
            user?.profile?.shareAudio
        ) {
            console.log('CREATE IT')
            createLocalTrack('audio', { micDeviceId: user?.profile?.audioRecorder }).then((newTrack) => {
                console.log('🚀 -------------------------------------------------------------------------🚀')
                console.log('🚀 - file: meet-low-level.js:126 - createLocalTrack - newTrack:', newTrack)
                console.log('🚀 -------------------------------------------------------------------------🚀')
                if (!audioTrack) {
                    console.log('ADD IT')
                    user?.profile?.shareAudio ? newTrack.unmute() : newTrack.mute()
                    attachLocalTrack(newTrack)

                    meetLowLevel.room.addTrack(newTrack)
                    this.localTracks.set([newTrack])
                } else if (audioTrack.getDeviceId() !== user?.profile?.audioRecorder) {
                    console.log('REPLACE IT')
                    this.template.localTracks.set(
                        this.localTracks.get().map((mapTrack) => {
                            console.log('🚀 --------------------------------------------------------🚀')
                            console.log('🚀 - file: utils.js:56 - localTracks.map - track:', track)
                            console.log('🚀 --------------------------------------------------------🚀')
                            if (mapTrack.getType() === newTrack.getType()) {
                                // Replace old tracks by the new one
                                meetLowLevel.room.replaceTrack(mapTrack, newTrack)
                                // track.dispose().then(() => console.log('ON DISPOSE'))
                                attachLocalTrack(newTrack)
                                return newTrack
                            }

                            return mapTrack
                        })
                    )
                }
            })
            // Else if current audio track device differs from the new settings, replace it
        } else if (audioTrack) {
            console.log('TOGGLE IT')
            if (user?.profile?.shareAudio && audioTrack.isMuted()) {
                console.log('UNMUTE IT')
                audioTrack.unmute()
            } else if (!user?.profile?.shareAudio && !audioTrack.isMuted()) {
                console.log('MUTE IT')
                audioTrack.mute()
            }
        }
    })

    this.autorun(() => {
        if (this.connection.get() && Session.get('isJitsiMeetOpen')) {
            meetLowLevel.disconnect()
        }
    })

    window.addEventListener(eventTypes.onUsersComeCloser, (e) => onUsersComeCloser(e, this))
    window.addEventListener(eventTypes.onUsersMovedAway, (e) => onUsersMovedAway(e, this))
    // window.addEventListener(eventTypes.onUserPropertyUpdated, (e) => onUserPropertyUpdated(e, this))
})

Template.meetLowLevel.onDestroyed(() => {
    window.removeEventListener(eventTypes.onUsersComeCloser, (e) => onUsersComeCloser(e, this))
    window.removeEventListener(eventTypes.onUsersMovedAway, (e) => onUsersMovedAway(e, this))
    // window.removeEventListener(eventTypes.onUserPropertyUpdated, (e) => onUserPropertyUpdated(e, this))
})

Template.meetLowLevel.helpers({
    avatarURL() {
        return Template.instance().avatarURL.get()
    },
    isActive() {
        const isActive = Template.instance().connection.get() !== undefined && meetLowLevel.getCallCount() > 0

        Session.set('isLowLevelActive', isActive)
        return isActive
    },
    remoteTracks() {
        // Check a better way to remove undefined tracks
        console.log(
            '🚀 -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------🚀'
        )
        console.log(
            '🚀 - file: meet-low-level.js:108 - remoteTracks - Object.values(Template.instance().remoteTracks.get()).filter((track) => track.audio && track.camera):',
            Object.values(Template.instance().remoteTracks.get()).filter((track) => track.audio || track.camera)
        )
        console.log(
            '🚀 -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------🚀'
        )

        return Object.values(Template.instance().remoteTracks.get()).filter((track) => track.audio || track.camera)
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
 ** Events listeners
 */

const onUsersComeCloser = (e, template) => {
    const { users } = e.detail

    if (jitsiMeetJS && !template.connection.get() && !meetLowLevel.connectionStarted) {
        meetLowLevel.connectionStarted = true

        Meteor.call('getUserRoomName', users[0]._id, (err, roomName) => {
            if (!roomName) {
                const usersIds = users.map((user) => user._id).concat(Meteor.userId())
                Meteor.call('computeMeetLowLevelRoomName', usersIds, (err, computedRoomName) => {
                    if (!computedRoomName) {
                        lp.notif.error('Unable to load a room, please try later')
                        return
                    }

                    meetLowLevel.roomName = computedRoomName
                    meetLowLevel.connect()
                })
            } else {
                meetLowLevel.roomName = roomName
                Meteor.call('updateUserRoomName', roomName)
                meetLowLevel.connect()
            }
        })
    }

    users.forEach((user) => {
        if (!meetLowLevel.usersInCall[user._id]) {
            meetLowLevel.usersInCall[user._id] = {
                callStartDate: Date.now(),
            }
            Meteor.call('analyticsDiscussionAttend', {
                peerUserId: user._id,
                usersAttendingCount: meetLowLevel.getCallCount(),
            })
        }
    })
}

const onUsersMovedAway = (e, template) => {
    const { users } = e.detail

    console.log('🚀 -----------------------------------------------------------------------------------------🚀')
    console.log('🚀 - onUsersMovedAway')
    console.log('🚀 -----------------------------------------------------------------------------------------🚀')

    users.forEach((user) => {
        if (meetLowLevel.usersInCall[user._id]) {
            const duration = (Date.now() - meetLowLevel.usersInCall[user._id].callStartDate) / 1000
            Meteor.call('analyticsDiscussionEnd', {
                peerUserId: user._id,
                duration,
                usersAttendingCount: meetLowLevel.getCallCount(template),
            })
            delete meetLowLevel.usersInCall[user._id]
        }
    })

    if (template.connection.get() && meetLowLevel.getCallCount() === 0) {
        meetLowLevel.disconnect()
    }
}

const onUserPropertyUpdated = async (e, template) => {
    const { propertyName, propertyValue } = e.detail
    const localTracks = template.localTracks.get()

    if (!localTracks || localTracks.length === 0 || !propertyName) return

    if (propertyName === 'shareAudio') {
        toggleTrackMuteState('audio', localTracks)
    } else if (propertyName === 'shareVideo') {
        toggleTrackMuteState('video', localTracks)
    } else if (propertyName === 'shareScreen') {
        if (propertyValue) {
            await jitsiMeetJS.createLocalTracks({ devices: ['desktop'] }).then((tracks) => {
                const currentDesktopTrack = localTracks.find((t) => t.getVideoType() === 'desktop')
                const screenNode = document.querySelector('#video-screen-me')
                const track = tracks[0] // Since we just ask for desktop, we will only have one item

                track.attach(screenNode)

                // If it's the first time we share screen, we should add it to the conference
                if (!currentDesktopTrack) {
                    meetLowLevel.room.addTrack(track)
                } else {
                    // Otherwise, we should replace since because Meet will not trigger 'TRACK_REMOVED' when we dispose the desktop track
                    meetLowLevel.room.replaceTrack(currentDesktopTrack, track)
                }

                localTracks.push(track)
                template.localTracks.set(localTracks)
            })
        } else {
            const filteredLocalTracks = localTracks.filter((track) => {
                // While we remove the desktop track, we dispose it at the same time
                if (track.getVideoType() === 'desktop') {
                    console.log('ON DISPOSE DESKTOP')
                    track.dispose()
                    return false
                }
                return true
            })

            template.localTracks.set(filteredLocalTracks)
        }
    }
}

/*
 ** LowMeetJs
 */

const getOptions = () => {
    const serverURL = Meteor.settings.public.meet.serverURL

    if (!serverURL) return
    const [domain, sub] = serverURL.split('/')

    return {
        // Connection
        hosts: {
            domain: serverURL,
            muc: `conference.${sub}.${domain}`,
            focus: `focus.${domain}`,
        },
        serviceUrl: `wss://${serverURL}/xmpp-websocket?room=${meetLowLevel.roomName}`,
        websocketKeepAliveUrl: `https://${serverURL}/_unlock?room=${meetLowLevel.roomName}`,

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
    }
}

const createLocalTrack = async (device, options) => {
    const track = await jitsiMeetJS
        .createLocalTracks({
            ...options,
            devices: [device],
        })
        .then((tracks) => tracks[0])
        .catch((err) => console.error('An error occured while creating local tracks', err))

    return track
}

export const meetLowLevel = {
    connectionStarted: false,
    room: undefined,
    roomName: undefined,
    usersInCall: {},
    template: undefined,

    async connect() {
        if (!this.template.connection.get()) {
            const options = getOptions()
            const user = Meteor.user({ fields: { 'profile.audioRecorder': 1, 'profile.videoRecorder': 1 } })

            jitsiMeetJS.init(options)
            jitsiMeetJS.setLogLevel(jitsiMeetJS.logLevels.ERROR)

            // await jitsiMeetJS
            //     .createLocalTracks({
            //         devices: ['audio', 'video'],
            //         cameraDeviceId: user?.profile?.videoRecorder,
            //         micDeviceId: user?.profile?.audioRecorder,
            //     })
            //     .then((tracks) => {
            //         updateTrack('video', tracks)
            //         updateTrack('audio', tracks)
            //         attachLocalTracks(tracks)
            //         this.template.localTracks.set(tracks)
            //     })
            //     .catch((err) => console.error('An error occured while creating local tracks', err))

            Meteor.call('computeRoomToken', this.roomName, (err, token) => {
                const connection = new jitsiMeetJS.JitsiConnection(null, token, options)

                connection.addEventListener(jitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
                    this.onConnectionSuccess()
                })
                connection.addEventListener(jitsiMeetJS.events.connection.CONNECTION_FAILED, () => {
                    this.onConnectionFailed()
                })
                connection.addEventListener(jitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, () => {
                    this.onConnectionDisconnected()
                })

                connection.connect()
                this.template.connection.set(connection)
            })
        }
    },

    async disconnect() {
        const connection = this.template.connection.get()

        for (const track of this.template.localTracks.get()) {
            console.log('track', track, track.isMuted())
            await track.unmute()
            console.log('🚀 ---------------------------------------------------------------------------------🚀')
            console.log('🚀 - file: meet-low-level.js:419 - disconnect - track.isMuted():', track.isMuted())
            console.log('🚀 ---------------------------------------------------------------------------------🚀')
            console.log('IS UNMUTE')
            await track.dispose()
            console.log('IS DISPOSED')
        }

        this.connectionStarted = false
        Meteor.call('updateUserRoomName', undefined)
        if (this.room?.room) {
            try {
                this.room.leave()
            } catch (err) {
                console.log('Error while leaving', err)
            }
        }

        console.log('ET LA ON AVANCE')

        this.template.localTracks.set([])
        this.template.remoteTracks.set({})

        this.usersInCall = []
        toggleUserProperty('shareScreen', false)
        toggleUserProperty('shareVideo', false)
        toggleUserProperty('shareAudio', false)

        connection.disconnect()
        connection.removeEventListener(jitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
            this.onConnectionSuccess()
        })
        connection.removeEventListener(jitsiMeetJS.events.connection.CONNECTION_FAILED, () => {
            this.onConnectionFailed()
        })
        connection.removeEventListener(jitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, () => {
            this.onConnectionDisconnected()
        })

        this.room = undefined
        this.template.connection.set(undefined)

        console.log(
            'this',
            this,
            this.template.connection.get(),
            this.template.localTracks.get(),
            this.template.remoteTracks.get()
        )
    },

    getCallCount() {
        return Object.keys(this.usersInCall).length
    },

    /*
     **  LowMeetJs events listeners
     */
    onTrackAdded(track) {
        console.log('LAAAA IL A ADD', track)
        // Since we attach local tracks separately, we do not need attach it again
        if (track.isLocal()) return

        const participantId = track.getParticipantId()
        const _remoteTracks = this.template.remoteTracks.get()

        if (!_remoteTracks[participantId]) _remoteTracks[participantId] = {}

        if (track.getType() === 'video') {
            // When receiving a 'desktop' track, Jitsi doesn't immediately set the correct type, leading to confusion with our own tracks.
            // Initially, a 'desktop' track is classified as a 'camera' type, but after a few seconds, it is eventually updated to a 'desktop' track type.
            // This inconsistency is quite frustrating, and since we haven't found a suitable solution, it's better to introduce a timeout before setting the track type to 'video'.
            // Cf: https://community.jitsi.org/t/identifying-new-track-as-desktop/118232/2

            setTimeout(() => {
                _remoteTracks[participantId][getTrackType(track)] = track
                this.template.remoteTracks.set(_remoteTracks)
            }, 1000)
        } else {
            _remoteTracks[participantId][getTrackType(track)] = track
            this.template.remoteTracks.set(_remoteTracks)
        }

        console.log(
            '🚀 ---------------------------------------------------------------------------------------------------------🚀'
        )
        console.log(
            '🚀 - file: meet-low-level.js:489 - onTrackAdded - this.template.remoteTracks:',
            this.template.remoteTracks.get()
        )
        console.log(
            '🚀 ---------------------------------------------------------------------------------------------------------🚀'
        )
    },

    onTrackRemoved(track) {
        const _remoteTracks = this.template.remoteTracks.get()
        const participantId = track.getParticipantId()

        if (_remoteTracks[participantId]) {
            _remoteTracks[participantId][getTrackType(track)] = null

            if (_remoteTracks[participantId].length === 0) delete _remoteTracks[participantId]
            this.template.remoteTracks.set(_remoteTracks)
        }
    },

    onConferenceJoined() {
        console.log('conference joined!')

        // If the user is the only user in the conference, disconnect from the conference.
        if (this.getCallCount() === 0) {
            this.disconnect()
        }
    },

    onConferenceLeft() {
        console.log('conference left!')
    },

    onUserJoined(userId, participant) {
        console.log('user joined!', userId)
        const _remoteTracks = this.template.remoteTracks.get()

        if (!_remoteTracks[userId]) _remoteTracks[userId] = {}
        _remoteTracks[userId].displayName = participant.getDisplayName()
        this.template.remoteTracks.set(_remoteTracks)
    },

    onConnectionSuccess() {
        console.log('Successfully connected')
        const user = Meteor.user({ fields: { 'profile.name': 1 } })

        if (!this.room) {
            this.room = this.template.connection.get().initJitsiConference(this.roomName, {})
            // const _localTracks = this.template.localTracks.get()

            // // Add local tracks before joining
            // for (let i = 0; i < _localTracks.length; i++) {
            //     this.room.addTrack(_localTracks[i])
            // }

            // Setup event listeners
            this.room.on(jitsiMeetJS.events.conference.TRACK_ADDED, (track) => this.onTrackAdded(track))
            this.room.on(jitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
                console.log('TRACK REMOVED')
                if (track.isLocal()) return
                console.log('TRACK REMOVED AND NOT LOCAL')

                this.onTrackRemoved(track)
            })
            this.room.on(jitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
                this.onConferenceJoined()
            })
            this.room.on(jitsiMeetJS.events.conference.CONFERENCE_LEFT, () => {
                this.onConferenceLeft()
            })
            this.room.on(jitsiMeetJS.events.conference.USER_JOINED, (userId, participant) =>
                this.onUserJoined(userId, participant)
            )
            this.room.on(jitsiMeetJS.events.conference.USER_LEFT, (id) => console.log('user left!', id))

            // Join
            this.room.setDisplayName(user?.profile?.name)
            this.room.join()
            this.room.setSenderVideoConstraint(720) // Send at most 720p
            this.room.setReceiverVideoConstraint(360) // Receive at most 360p for each participant
        }
    },

    onConnectionFailed() {
        console.error('connection failed!')
    },

    onConnectionDisconnected() {
        console.log('connection disconnected')
    },
}
