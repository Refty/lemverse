import { canEditLevel, canEditActiveLevel, currentLevel } from '../lib/misc'

Meteor.publish('currentLevel', function () {
    if (!this.userId) return undefined

    const { name, levelId } = Meteor.user().profile
    const level = Levels.findOne(levelId || Meteor.settings.defaultLevelId)

    callHooks(level, activityType.userEnteredLevel, {
        userId: this.userId,
        meta: { name },
    })

    this.onStop(() =>
        callHooks(level, activityType.userLeavedLevel, {
            userId: this.userId,
            meta: { name },
        })
    )

    return Levels.find(
        { _id: level._id },
        {
            fields: {
                name: 1,
                spawn: 1,
                height: 1,
                width: 1,
                editorUserIds: 1,
                createdBy: 1,
                sandbox: 1,
                disabled: 1,
                lastMessageAt: 1,
                featuresPermissions: 1,
            },
        }
    )
})

Meteor.methods({
    toggleLevelEditionPermission(userId) {
        check(userId, Match.Id)

        const user = Meteor.user()
        const { levelId } = user.profile

        if (!canEditActiveLevel(user)) return

        if (!canEditActiveLevel(Meteor.users.findOne(userId)))
            Levels.update(levelId, {
                $addToSet: { editorUserIds: { $each: [userId] } },
            })
        else Levels.update(levelId, { $pull: { editorUserIds: userId } })
    },
    updateLevel(name, position, featurePermission = null) {
        if (!this.userId) throw new Meteor.Error('missing-user', 'A valid user is required')
        check(name, String)
        check(position, { x: Number, y: Number })
        check(
            featurePermission,
            Match.OneOf(
                null,
                {},
                { shout: String },
                { globalChat: String },
                { punch: String },
                { reactions: String },
                { follow: String },
                { sendVocal: String },
                { sendLove: String },
                { sendText: String },
                { extendedProfile: String},
            )
        )

        const user = Meteor.user()
        const level = currentLevel(Meteor.user())
        if (!level || level.sandbox) throw new Meteor.Error('invalid-level', 'A valid level is required')
        if (!canEditLevel(user, level)) throw new Meteor.Error('permission-error', `You can't edit this level`)

        const query = {
            $set: { name, spawn: { x: position.x, y: position.y } },
        }
        if (featurePermission)
            query.$set.featuresPermissions = {
                ...(level.featuresPermissions || {}),
                ...featurePermission,
            }

        Levels.update(level._id, query)
    },
})
