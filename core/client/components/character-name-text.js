import Phaser from 'phaser';

const nameStyle = {
  font: 'Verdana, "Times New Roman", Tahoma, serif',
  fontSize: 18,
  strokeColor: '#000',
  strokeSize: 3,
};

const baselineStyle = {
  ...nameStyle,
  fontSize: 12,
};

const defaultTint = 0xFFFFFF;
const baselineOffset = 20;
const iconOffset = 3;

class CharacterNameText {
  constructor(scene, name, baseline, tintName) {
    this.scene = scene;
    this.name = this.createText(name, nameStyle);
    this.setBaseline(baseline);
    this.setTintFromName(tintName);
  }

  createText(message, style) {
    const text = new Phaser.GameObjects.Text(this.scene, 0, 0, message);
    text.setFontFamily(style.font)
      .setFontSize(style.fontSize)
      .setStroke(style.strokeColor, style.strokeSize)
      .setDepth(99999)
      .setOrigin(0.5);

    this.scene.add.existing(text);
    return text;
  }

  setBaseline(text) {
    if (!text) {
      this.destroyBaseline();
      return;
    }
    if (this.baseline) {
      this.baseline.setText(text, baselineStyle);
      return;
    }
    this.baseline = this.createText(text, baselineStyle);
  }

  setTintFromName(tintName) {
    const colors = Meteor.settings.public.character.nameColors;
    if (!colors) return this;

    const color = colors[tintName] || [defaultTint];
    this.name.setTint(...color);
    if (this.baseline) {
      this.baseline.setTint(...color);
    }
    return this;
  }

  setText(name, baseline) {
    this.name.setText(name);
    this.setBaseline(baseline);
    return this;
  }

  setIcon(icon) {
    if (this.icon) this.destroyIcon();
    if (icon) {
      game.scene.getScene('BootScene').loadImagesAtRuntime([icon], () => {
        this.icon = this.scene.add.sprite(0, 0, icon.fileId);
        this.icon.displayHeight = icon.height;
        this.icon.displayWidth = icon.width;
      });
    }
  }

  setPosition(x, y) {
    const nameY = this.baseline ? y - baselineOffset : y;
    this.name.setPosition(x, nameY);
    if (this.baseline) this.baseline.setPosition(x, y);
    if (this.icon) this.icon.setPosition(x - (this.name.width + this.icon.displayWidth) / 2 - iconOffset, nameY);
  }

  destroyBaseline() {
    if (this.baseline) {
      this.baseline.destroy();
      this.baseline = undefined;
    }
  }

  destroyIcon() {
    if (this.icon) {
      this.icon.destroy();
      this.icon = undefined;
    }
  }

  destroy() {
    this.name.destroy();
    this.destroyBaseline();
    this.destroyIcon();
  }
}

export default CharacterNameText;
