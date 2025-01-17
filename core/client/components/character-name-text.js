import Phaser from 'phaser'

const nameStyle = {
    fontFamily: 'Verdana, "Times New Roman", Tahoma, serif',
    fontSize: 18,
    stroke: '#000',
    strokeThickness: 3,
}

const baselineStyle = {
    ...nameStyle,
    fontSize: 12,
}

const defaultTint = 0xffffff
const defaultColor = '#fff'
const baselineOffset = 20
const iconMargin = 3

class CharacterNameText extends Phaser.GameObjects.Container {
    constructor(scene, name, baseline, color) {
        super(scene)
        this.name = this.createText(name, nameStyle)
        this.nameContainer = new Phaser.GameObjects.Container(scene, 0, 0, [this.name])
        this.add(this.nameContainer).setBaseline(baseline).setColor(color).setDepth(99999)
        scene.add.existing(this)
    }

    createText(message, style) {
        return this.scene.make.text({ text: message, style }).setOrigin(0.5)
    }

    setBaseline(text) {
        if (!text) return this.destroyBaseline()
        if (!this.baseline) {
            this.baseline = this.createText(text, baselineStyle)
            this.add(this.baseline)
            this.nameContainer.setY(-baselineOffset)
        }
        this.baseline.setText(text)
        return this
    }

    static getStrokeColor(color) {
        if (!color) return '#000'
        const c = color.substring(1)
        const rgb = parseInt(c, 16)
        const r = (rgb >> 16) & 0xff
        const g = (rgb >> 8) & 0xff
        const b = (rgb >> 0) & 0xff

        const luma = 0.299 * r + 0.587 * g + 0.114 * b
        return luma > 150 ? '#000' : '#fff'
    }

    setColor(color) {
        const tints = Meteor.settings.public.character.nameColors
        if (tints) {
            const tint = tints[color] || [defaultTint]
            this.name.setTint(...tint)
            if (this.baseline) this.baseline.setTint(...tint)
        } else {
            this.name.setColor(color || defaultColor)
            this.name.setStroke(CharacterNameText.getStrokeColor(color), 3)
            if (this.baseline) {
                this.baseline.setColor(color)
                this.baseline.setStroke(CharacterNameText.getStrokeColor(color), 3)
            }
        }
        return this
    }

    setText(name, baseline) {
        this.name.setText(name)
        this.setBaseline(baseline)
        this.updateIconPosition()
        return this
    }

    updateIconPosition() {
        if (this.icon) this.icon.setX(-(this.name.width + this.icon.displayWidth) / 2 - iconMargin)
    }

    setIcon(icon) {
        this.destroyIcon()
        if (icon) {
            game.scene.getScene('BootScene').loadImagesAtRuntime([icon], () => {
                this.destroyIcon()
                this.icon = this.scene.make.sprite({ key: icon.fileId })
                this.icon.displayHeight = icon.height
                this.icon.displayWidth = icon.width
                this.updateIconPosition()
                this.nameContainer.add(this.icon)
            })
        }
    }

    destroyBaseline() {
        if (this.baseline) {
            this.nameContainer.setY(0)
            this.baseline.destroy()
            this.baseline = undefined
        }
        return this
    }

    destroyIcon() {
        if (this.icon) {
            this.icon.destroy()
            this.icon = undefined
        }
    }
}

export default CharacterNameText
