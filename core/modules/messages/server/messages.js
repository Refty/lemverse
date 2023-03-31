import { messagingAllowed } from '../misc';
import { getChannelType } from '../../../lib/misc';

const limit = 20;

const setCollectionLastMessageAtToNow = (collection, documentId) => collection.update(documentId, { $set: { lastMessageAt: new Date() } });

Meteor.startup(() => {
  Messages.find({ createdAt: { $gte: new Date() } }).observe({
    added(message) {
      const channelType = getChannelType(message.channel);

      if (channelType === 'zone') setCollectionLastMessageAtToNow(Zones, message.channel);
      else if (channelType === 'level') {
        setCollectionLastMessageAtToNow(Levels, message.channel);
      }
    },
  });
});

Meteor.publish('messages', function (channel) {
  check(channel, String);
  if (!this.userId) return undefined;
  if (!messagingAllowed(channel, this.userId)) throw new Meteor.Error('not-authorized', 'Access not allowed');

  return Messages.find({ channel }, { sort: { createdAt: -1 }, limit });
});

Meteor.methods({
  clearConferenceMessages(conferenceUUID) {
    if (!this.userId) return;

    log('clearConferenceMessages: start', { conferenceUUID, userId: this.userId });
    check(conferenceUUID, String);

    const user = Meteor.user();
    const zone = Zones.findOne({ uuid: conferenceUUID, levelId: user.profile.levelId });
    if (!zone) throw new Meteor.Error('not-found', 'Zone not found');
    if (!zone.roomName) throw new Meteor.Error('invalid-zone', 'Zone invalid (not a conference zone)');
    if (!zone.uuid) throw new Meteor.Error('invalid-zone', 'Zone without uuid (Conference room not initialized)');

    Messages.remove({ channel: zone._id });

    log('clearConferenceMessages: done', { zoneId: zone._id, conferenceUUID, userId: this.userId });
  },
  sendMessage(channel, text, fileId) {
    if (!this.userId) return undefined;

    log('sendMessage: start', { channel, text, fileId, userId: this.userId });
    check([channel, text], [String]);
    check(fileId, Match.Maybe(String));

    if (!messagingAllowed(channel, this.userId)) throw new Meteor.Error('not-authorized', 'Not allowed');

    const messageId = Messages.id();
    Messages.insert({
      _id: messageId,
      channel,
      text,
      fileId,
      createdAt: new Date(),
      createdBy: this.userId,
    });

    analytics.track(this.userId, '✍️ Message Sent', { user_id: this.userId, context: getChannelType(channel) });
    log('sendMessage: done', { messageId });

    return messageId;
  },
  toggleMessageReaction(messageId, reaction) {
    if (!this.userId) return;

    check(messageId, Match.Id);
    check(reaction, String);

    let message = Messages.findOne(messageId);
    if (!message) throw new Meteor.Error('not-found', 'Not found');

    if (!message.reactions || !message.reactions[reaction]?.includes(this.userId)) {
      Messages.update(messageId, { $addToSet: { [`reactions.${reaction}`]: this.userId } });
    } else {
      Messages.update(messageId, { $pull: { [`reactions.${reaction}`]: this.userId } });
    }

    message = Messages.findOne(messageId);
    if (message.reactions[reaction].length === 0) Messages.update(messageId, { $unset: { [`reactions.${reaction}`]: 1 } });
  },
  messagesUpdateChannelLastSeenDate(channelId, create = false) {
    if (!this.userId) return;
    check(channelId, Match.Id);
    check(create, Boolean);

    const { zoneLastSeenDates } = Meteor.user();
    if (create || (zoneLastSeenDates && zoneLastSeenDates[channelId])) {
      Meteor.users.update(this.userId, {
        $set: {
          [`zoneLastSeenDates.${channelId}`]: new Date(),
        },
      });
    }
  },
});
