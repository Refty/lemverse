import * as jwt from 'jsonwebtoken'
import crypto from 'crypto'

import { canAccessZone } from '../../../lib/misc'

const computeRoomName = (zone) => {
    check(zone._id, Match.Id)

    log('computeRoomName: start', { zoneId: zone._id })

    let { uuid } = zone
    if (!uuid) {
        uuid = crypto.randomUUID()
        Zones.update(zone._id, { $set: { uuid } })
    }

    log('computeRoomName: end', { uuid })

    return uuid
}

const computeRoomToken = (user, roomName, moderator = false) => {
    let group = 'guest'
    if (user.roles?.admin) group = 'admin'
    else if (moderator) group = 'moderator'

    const { algorithm, enableAuth, encryptionPassphrase, expiresIn, notBefore, keyid, identifier, iss, sub } =
        Meteor.settings.meet
    if (!enableAuth) return undefined

    return jwt.sign(
        {
            context: {
                user: {
                    id: user._id,
                    name: user.profile.name,
                    email: user.emails[0].address,
                    moderator,
                },
                group,
            },
            aud: identifier,
            iss: iss || Meteor.settings.public.lp.product,
            sub: sub || Meteor.settings.public.meet.serverURL,
            room: roomName,
        },
        encryptionPassphrase,
        { algorithm, expiresIn, notBefore, keyid }
    )
}

const updateUserRoomName = (roomName) => {
    const updateObject = roomName ? { $set: { 'meet.roomName': roomName } } : { $unset: { 'meet.roomName': 1 } }
    Meteor.users.update(Meteor.userId(), updateObject)
}

Meteor.methods({
    computeMeetRoomAccess(zoneId) {
        if (!this.userId) return undefined
        check(zoneId, Match.Id)

        log('computeMeetRoomAccess: start', { zoneId, userId: this.userId })

        const zone = Zones.findOne(zoneId)
        if (!zone) throw new Meteor.Error('not-found', 'Zone not found')
        if (!zone.roomName) throw new Meteor.Error('invalid-zone', 'This zone is not a meet zone')

        const user = Meteor.user()
        if (!canAccessZone(zone, user)) {
            log('computeMeetRoomAccess: user not allowed')
            throw new Meteor.Error('not-allowed', 'User not allowed in the zone')
        }

        const moderator = user.roles?.admin || Meteor.settings.meet.everyoneIsModerator
        const roomName = computeRoomName(zone)
        const token = computeRoomToken(user, roomName, moderator)

        log('computeMeetRoomAccess: end', { roomName, token })

        return { roomName, token }
    },
    updateUserRoomName(roomName) {
        check(roomName, Match.Maybe(String))
        const user = Meteor.user()
        if (user.meet.roomName === roomName) return

        log('updateUserRoomName: start', { roomName })
        updateUserRoomName(roomName)
        log('updateUserRoomName: end', { roomName })
    },
    getUserRoomName(userId) {
        check(userId, Match.OneOf(null, Match.Id))
        const user = Meteor.users.findOne({ _id: userId || Meteor.userId() }, { fields: { 'meet.roomName': 1 } })
        if (!user) return

        log('getUserRoomName: start', { userId: userId })
        return user.meet?.roomName
        log('getUserRoomName: end', { userId: userId })
    },
    computeMeetLowLevelRoomName(usersIds) {
        if (!this.userId) return undefined
        check(usersIds, Array)

        log('computeMeetLowLevelRoomName: start', { usersIds })

        const salt = Meteor.settings.meet.salt
        const meetRoomName = usersIds
            .sort((a, b) => a.localeCompare(b))
            .join('-')
            .toLowerCase()

        const hmac = crypto.createHmac('sha1', salt)
        hmac.setEncoding('base64')
        hmac.write(meetRoomName)
        hmac.end()
        hashedMeetRoomName = hmac.read().toLowerCase()

        updateUserRoomName(hashedMeetRoomName)
        log('computeMeetLowLevelRoomName: end', { meetRoomName: hashedMeetRoomName })

        return hashedMeetRoomName
    },
})

export { computeRoomName, computeRoomToken }
