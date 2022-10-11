import { currentLevel } from '../../../lib/misc';
import { toggleUIInputs } from '../../helpers';

const checkLevelName = value => {
  if (!value) throw new Error('A name is required');
  if (value.length < 3) throw new Error('Level\'s name must be at least 2 characters');
};

const updateLevel = (name, spawnPosition, hide = false, featuresPermissions) => {
  try {
    checkLevelName(name);
  } catch (e) {
    lp.notif.error(e.name);
    return;
  }

  Meteor.call('updateLevel', name, spawnPosition, hide, featuresPermissions, err => {
    if (err) { lp.notif.error(err.reason); return; }
    lp.notif.success('Level updated!');
  });
};

const getFeaturesPermissions = () => currentLevel(Meteor.user()).featuresPermissions || {};
const updateFeaturePermissionLevel = (permission, event) => {
  const level = currentLevel(Meteor.user());

  updateLevel(level.name, level.spawn, level.hide, { [permission]: event.target.value });
  event.target.blur();
};

Template.levelToolbox.events({
  'focus input'() { toggleUIInputs(true); },
  'blur input'() { toggleUIInputs(false); },
  'blur .js-name'(event) {
    const level = currentLevel(Meteor.user());
    updateLevel(event.target.value, level.spawn, level.hide);
  },
  'change .js-hidden'(event) {
    const level = currentLevel(Meteor.user());
    updateLevel(level.name, level.spawn, event.target.checked);
  },
  'click .js-spawn-position'() {
    const user = Meteor.user();
    const level = currentLevel(user);
    const { x, y } = user.profile;
    updateLevel(level.name, { x, y }, level.hide);
  },
  'change .js-voice-amplifier-select'(event) {
    updateFeaturePermissionLevel('shout', event);
  },
  'change .js-global-chat-select'(event) {
    updateFeaturePermissionLevel('globalChat', event);
  },
  'change .js-punch-select'(event) {
    updateFeaturePermissionLevel('punch', event);
  },
  'change .js-reactions-select'(event) {
    updateFeaturePermissionLevel('reactions', event);
  },
  'change .js-follow-select'(event) {
    updateFeaturePermissionLevel('follow', event);
  },
  'change .js-send-vocal-select'(event) {
    updateFeaturePermissionLevel('sendVocal', event);
  },
  'change .js-send-love-select'(event) {
    updateFeaturePermissionLevel('sendLove', event);
  },
  'change .js-send-text-select'(event) {
    updateFeaturePermissionLevel('sendText', event);
  },
});

Template.levelToolbox.helpers({
  name() { return currentLevel(Meteor.user()).name; },
  hidden() { return currentLevel(Meteor.user()).hide || false; },
  spawnPosition() {
    const { spawn } = currentLevel(Meteor.user());
    return `${Math.round(spawn.x)} - ${Math.round(spawn.y)}`;
  },
  dropdownValues() {
    return [
      { value: 'enabled', label: 'Enabled' },
      { value: 'adminOnly', label: 'Admin only' },
      { value: 'disabled', label: 'Disabled' },
    ];
  },
  shout() { return getFeaturesPermissions().shout || 'enabled'; },
  globalChat() { return getFeaturesPermissions().globalChat || 'enabled'; },
  punch() { return getFeaturesPermissions().punch || 'enabled'; },
  reaction() { return getFeaturesPermissions().reaction || 'enabled'; },
  follow() { return getFeaturesPermissions().follow || 'enabled'; },
  sendVocal() { return getFeaturesPermissions().sendVocal || 'enabled'; },
  sendLove() { return getFeaturesPermissions().sendLove || 'enabled'; },
  sendText() { return getFeaturesPermissions().sendText || 'enabled'; },
});
