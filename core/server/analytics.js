const Analytics = require('analytics-node')

const { enable, writeKey } = Meteor.settings?.public?.segmentAnalyticsSettings || {}
const isEnabled = enable === true && !!writeKey
const analyticsInstance = !isEnabled ? undefined : new Analytics(writeKey, { flushAt: 1 })

analytics = {
    identify(user) {
        if (!isEnabled) return

        const userData = {
            // Reserved traits
            id: user._id,
            name: user.profile.name,
            email: user.emails[0].address,
            created_at: user.createdAt,

            // Custom traits
            login_email_address: user.emails[0].address,
            mic_permission_state: user.profile.shareAudio,
            camera_permission_state: user.profile.shareVideo,
            screen_permission_state: user.profile.shareScreen,
            login_email_address_verified: user.emails[0].verified,
        }

        const context = {}
        const ddp = DDP._CurrentMethodInvocation.get() || DDP._CurrentPublicationInvocation.get()
        if (ddp?.connection?.httpHeaders?.['x-forwarded-for'])
            context.ip = ddp.connection.httpHeaders['x-forwarded-for']
        if (ddp?.connection?.httpHeaders?.['user-agent']) context.userAgent = ddp.connection.httpHeaders['user-agent']

        try {
            analyticsInstance.identify({
                userId: user._id,
                traits: userData,
                context,
            })
        } catch (err) {
            log(`analytics.identify: failed to identify user`, {
                _id: user._id,
                err,
            })
        }
    },

    track(userId, event, properties) {
        if (!isEnabled) return

        try {
            analyticsInstance.track({
                event,
                userId,
                properties: { ...properties },
            })
        } catch (err) {
            log(`analytics.track: failed to track event`, {
                userId,
                event,
                properties,
                err,
            })
        }
    },

    page(userId, name, properties) {
        if (!isEnabled) return

        try {
            analyticsInstance.page({
                userId,
                name,
                properties: { ...properties },
            })
        } catch (err) {
            log(`analytics.page: page failed`, { name, properties, err })
        }
    },
}

Meteor.methods({
    analyticsDiscussionAttend(properties) {
        const { userId } = this
        if (!userId) return

        check(properties, {
            peerUserId: String,
            usersAttendingCount: Number,
        })

        const user = Meteor.user()
        analytics.track(userId, '💬 Discussion Attend', {
            level_id: user.profile.levelId,
            peer_user_id: properties.peerUserId,
            users_attending_count: properties.usersAttendingCount,
        })
    },
    analyticsDiscussionEnd(properties) {
        const { userId } = this
        if (!userId) return

        check(properties, {
            usersAttendingCount: Number,
            duration: Number,
            peerUserId: String,
        })

        const user = Meteor.user()
        analytics.track(userId, '💬 Discussion End', {
            duration: properties.duration,
            level_id: user.profile.levelId,
            peer_user_id: properties.peerUserId,
            users_attending_count: properties.usersAttendingCount,
        })
    },
    analyticsConferenceAttend(properties) {
        const { userId } = this
        if (!userId) return

        check(properties, {
            zoneId: String,
            zoneName: String,
        })

        const user = Meteor.user()
        analytics.track(userId, '🎤 Conference Attend', {
            level_id: user.profile.levelId,
            zone_id: properties.zoneId,
            zone_name: properties.zoneName,
        })
    },
    analyticsConferenceEnd(properties) {
        const { userId } = this
        if (!userId) return

        check(properties, {
            zoneId: String,
            zoneName: String,
        })

        const user = Meteor.user()
        analytics.track(userId, '🎤 Conference End', {
            level_id: user.profile.levelId,
            zone_id: properties.zoneId,
            zone_name: properties.zoneName,
        })
    },
    analyticsReaction(properties) {
        const { userId } = this
        if (!userId) return

        check(properties, {
            reaction: String,
        })

        const user = Meteor.user()
        analytics.track(userId, '😂 Reaction', {
            level_id: user.profile.levelId,
            coordinates: [user.profile.x, user.profile.y],
            reaction: properties.reaction,
        })
    },
    analyticsKick() {
        const { userId } = this
        if (!userId) return

        const user = Meteor.user()
        analytics.track(userId, '🦵🏻 Kick', {
            level_id: user.profile.levelId,
        })
    },
})
