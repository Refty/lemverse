import { canUseLevelFeature, moduleType } from '../../../lib/misc';


window.addEventListener('load', () => {
  Tracker.autorun(track => {
    if (Session.get('loading')) return;

    const user = Meteor.user();
    if (!user) return;

    const isShoutFeatureEnabled = canUseLevelFeature(Meteor.user(), 'shout');
    if (user.roles?.admin || isShoutFeatureEnabled) {
      registerModules([
        { id: 'shout', icon: '📢', label: 'Shout', order: 40, shortcut: 55, scope: 'me' },
    moduleType.RADIAL_MENU,
      ]);
    }

    track.stop();
  });

  hotkeys('r', { keyup: true, scope: scopes.player }, event => {
    if (event.repeat) return;

    const user = Meteor.user({ fields: { _id: 1, 'profile.levelId': 1, roles: 1 } });
    
    if (!user || !canUseLevelFeature(user, 'shout', true)) return;

    userVoiceRecorderAbility.recordVoice(event.type === 'keydown', sendAudioChunksToUsersInZone);
  });

  const onMenuOptionSelected = e => {
    const { option } = e.detail;
    const user = Meteor.user({ fields: { _id: 1, 'profile.levelId': 1, roles: 1 } });

    if (option.id !== 'shout' || !canUseLevelFeature(user, 'shout', true)) return;

    userVoiceRecorderAbility.recordVoice(true, sendAudioChunksToUsersInZone);
  };

  const onMenuOptionUnselected = e => {
    const { option } = e.detail;
    const user = Meteor.user({ fields: { _id: 1, 'profile.levelId': 1, roles: 1 } });

    if (option.id !== 'shout' || !canUseLevelFeature(user, 'shout')) return;

    userVoiceRecorderAbility.recordVoice(false, sendAudioChunksToUsersInZone);
  };

  window.addEventListener(eventTypes.onMenuOptionSelected, onMenuOptionSelected);
  window.addEventListener(eventTypes.onMenuOptionUnselected, onMenuOptionUnselected);
});
