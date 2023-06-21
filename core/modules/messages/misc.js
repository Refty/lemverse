import { canAccessZone, canModerateUser } from '../../lib/misc'

const permissionType = 'useMessaging'

const messagingAllowed = (channel, userId) => {
    check(channel, String)
    check(userId, Match.Id)

    if (channel.includes('usr_')) return channel.split(';').includes(userId)

    check(channel, Match.Id)
    if (channel.includes('zon_')) return canAccessZone(Zones.findOne(channel), Meteor.users.findOne(userId))
    if (channel.includes('lvl_')) return Meteor.users.findOne(userId)?.profile.levelId === channel

    return false
}

const messageModerationAllowed = (user, message) => {
    check([user._id, message._id], [Match.Id])

    if (message.createdBy === user._id) return true

    const userOwningMessage = Meteor.users.findOne(message.createdBy)
    if (!userOwningMessage) return false

    return canModerateUser(user, userOwningMessage)
}

export { messagingAllowed, messageModerationAllowed, permissionType }
