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

  setPosition(x, y) {
    this.name.setPosition(x, this.baseline ? y - baselineOffset : y);
    if (this.baseline) this.baseline.setPosition(x, y);
  }

  destroyBaseline() {
    if (this.baseline) {
      this.baseline.destroy();
      this.baseline = undefined;
    }
  }

  destroy() {
    this.name.destroy();
    this.destroyBaseline();
  }
}

export default CharacterNameText;
