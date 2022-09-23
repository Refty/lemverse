const ONBOARDING_LAST_STEP = 2;
const keyboards = ['q', 'z', 's', 'd', 'left', 'right', 'up', 'down'];

const bindKeyboards = () => {
  keyboards.forEach(key => {
    hotkeys(key, { keyup: true }, event => {
      if (event.repeat) return;

      Session.set('pressedKeyboard', null);
    });
  });
};

const requestUserMedia = async () => {
  const constraints = userStreams.getStreamConstraints(streamTypes.main);
  const stream = await userStreams.requestUserMedia(constraints);
  if (!stream) { lp.notif.error(`unable to get a valid stream`); return; }

  if (Session.get('sceneWorldReady')) {
    // We disable keyboard to not let the player move while onboarding
    const worldScene = game.scene.getScene('WorldScene');
    worldScene.enableKeyboard(false);
  }

  Session.set('streamAccepted', true);

  // We should stop the stream directly after asking permissions, since we just want to check if the user has granted permissions
  userStreams.destroyStream(streamTypes.main);
};

const finishOnboarding = () => {
  Meteor.users.update(Meteor.userId(), { $unset: { 'profile.guest': true } });

  lp.notif.success('Enjoy 🚀');
};

Template.userOnboarding.onCreated(async () => {
  // await requestUserMedia();
  bindKeyboards();


  Tracker.autorun(() => {
    console.log('LOL');
    console.log('🚀 -------------------------------------------------------------------------------------------------------------------------🚀');
    console.log('🚀 ~ file: user-onboarding.js ~ line 45 ~ Tracker.autorun ~ Session.get(\'sceneWorldReady\')', Session.get('sceneWorldReady'));
    console.log('🚀 -------------------------------------------------------------------------------------------------------------------------🚀');
    if (!Session.get('sceneWorldReady') && game.scene.getScene('LoadingScene').scene.isVisible()) return;

    Tracker.nonreactive(() => {
      console.log('🚀 -----------------------------------------------------------------------------------------------------------------------------🚀');
      console.log('🚀 ~ file: user-onboarding.js ~ line 60 ~ Tracker.nonreactive ~ Session.get(\'sceneWorldReady\')', Session.get('sceneWorldReady'));
      console.log('🚀 -----------------------------------------------------------------------------------------------------------------------------🚀');
      game.scene.getScene('WorldScene').scene.setVisible(false);
      console.log('ON LA RENDU INVISIBLE');
    });
  });
});

Template.userOnboarding.onDestroyed(() => {
  keyboards.forEach(key => hotkeys.unbind(key));
});

Template.userOnboarding.events({
  'click .button'() {
    const onboardingStep = Session.get('onboardingStep') || 1;
    console.log('ON PASSE ENCORE LA');

    if (onboardingStep === ONBOARDING_LAST_STEP) {
      finishOnboarding();
    } else {
      Session.set('onboardingStep', onboardingStep + 1);
    }
  },
});

Template.userOnboarding.helpers({
  streamAccepted: () => Session.get('streamAccepted') || false,
  step: () => Session.get('onboardingStep') || 1,
  pressedKeyboard: () => Session.get('pressedKeyboard') || null,
});
