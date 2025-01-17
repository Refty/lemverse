import * as jwt from 'jsonwebtoken'

import { canAccessZone } from '../../../lib/misc'

const { randomUUID } = require('crypto')

const computeRoomName = (zone) => {
    check(zone._id, Match.Id)

    log('computeRoomName: start', { zoneId: zone._id })

    let { uuid } = zone
    if (!uuid) {
        uuid = randomUUID()
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
})

export { computeRoomName, computeRoomToken }
