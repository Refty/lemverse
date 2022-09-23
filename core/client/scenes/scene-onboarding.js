import nipplejs from 'nipplejs';
import Phaser from 'phaser';

const fixedUpdateInterval = 200;


const POS_Y = window.innerHeight / 2;
const POS_X = window.innerWidth / 2;


OnboardingScene = new Phaser.Class({
  Extends: Phaser.Scene,

  initialize: function OnboardingScene() {
    Phaser.Scene.call(this, { key: 'OnboardingScene' });
  },

  init() {
    // controls
    this.enableKeyboard(true, true);
    this.keys = this.input.keyboard.addKeys({
      ...this.input.keyboard.createCursorKeys(),
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      z: Phaser.Input.Keyboard.KeyCodes.Z,
      w: Phaser.Input.Keyboard.KeyCodes.W,
    }, false, false);


    this.scene.setVisible(true);

    userManager.init(this);
  },

  preload() {
    this.load.setBaseURL('/');
    this.load.image('scene-onboarding-background', 'assets/images/scene-onboarding-background.png');
  },

  create() {
    userManager.setUserCanMove(false);
  },



  // refreshSizeAndPosition() {
  //   this.background.setSize(window.innerWidth, window.innerHeight);
  //   this.background_characters.setSize(window.innerWidth, window.innerHeight);
  //   this.logo.setPosition(window.innerWidth / 2.0, window.innerHeight / 2.0 - 60);
  //   this.text.setPosition(window.innerWidth / 2.0, window.innerHeight / 2.0 + 45);
  // },

  hide(callback = undefined) {
    if (!Session.get('loading')) return;
    if (!this.container) this.create(false);

    this.tweens.add({
      targets: this.container,
      alpha: { start: 1, from: 1, to: 0, duration: this.fadeOutDuration, ease: 'Linear' },
      onComplete: () => {
        Session.set('loading', false);
        this.scene.sleep();
        if (callback) callback();
      },
    });
  },

  show(callback = undefined) {
    if (Session.get('loading')) return;

    Session.set('loading', true);
    this.refreshSizeAndPosition();
    this.scene.wake();
    this.tweens.add({
      targets: this.container,
      alpha: { start: 0, from: 0, to: 1, duration: this.fadeInDuration, ease: 'Linear' },
      onComplete: () => {
        if (callback) callback();
      },
    });
  },

  enableKeyboard(value, globalCapture) {
    const { keyboard } = this.input;
    if (!keyboard) return;
    keyboard.enabled = value;

    if (globalCapture) keyboard.enableGlobalCapture();
    else keyboard.disableGlobalCapture();
  },
});
