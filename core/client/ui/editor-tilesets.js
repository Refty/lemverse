zoom = 1.5
const _selectedTileset = new ReactiveVar()
selectedTileset = () => _selectedTileset.get()

Tracker.autorun(() => {
    const tilesetId = Session.get('selectedTilesetId')
    if (!tilesetId) return
    _selectedTileset.set(Tilesets.findOne(tilesetId) || {})
})

Tracker.autorun(() => {
    const creating = Session.get('selectedEditTilesetId')
    if (creating) {
        Tracker.afterFlush(() => {
            $(`#${creating}`).focus()
        })
    }
})

Template.registerHelper('tile2domX', (index) => {
    if (!index) return 0
    const tileX = index % (selectedTileset().width / 16)
    return zoom * tileX * 16
})

Template.registerHelper('tile2domY', (index) => {
    if (!index) return 0
    const tileY = (index / (selectedTileset().width / 16)) | 0
    return zoom * tileY * 16
})

Template.registerHelper('tilesets', () => {
    const filters = { hidden: { $ne: true } }
    if (Meteor.user()?.roles?.admin) delete filters.hidden

    return Tilesets.find(filters, { sort: { name: 1 } })
})

Template.registerHelper('selectedTileset', () => selectedTileset())

Template.registerHelper('zoom', (v, w) => zoom * v * w)

Template.editorTilesets.onCreated(function () {
    this.subscribe('tilesets')

    hotkeys('p', (event) => {
        event.preventDefault()
        Session.set('displayTilesetPropertiesModal', Session.get('pointerTileIndex'))
    })

    hotkeys('c', (event) => {
        event.preventDefault()
        const pointerTileIndex = Session.get('pointerTileIndex')
        if (selectedTileset().collisionTileIndexes?.includes(pointerTileIndex)) {
            Tilesets.update(selectedTileset()._id, {
                $pull: { collisionTileIndexes: pointerTileIndex },
            })
        } else {
            Tilesets.update(selectedTileset()._id, {
                $addToSet: { collisionTileIndexes: pointerTileIndex },
            })
        }
    })
    hotkeys('0', (event) => {
        event.preventDefault()
        const pointerTileIndex = Session.get('pointerTileIndex')
        Tilesets.update(selectedTileset()._id, {
            $set: { [`tiles.${pointerTileIndex}.layer`]: 0 },
        })
    })
    hotkeys('1', (event) => {
        event.preventDefault()
        const pointerTileIndex = Session.get('pointerTileIndex')
        Tilesets.update(selectedTileset()._id, {
            $set: { [`tiles.${pointerTileIndex}.layer`]: 1 },
        })
    })
    hotkeys('2', (event) => {
        event.preventDefault()
        const pointerTileIndex = Session.get('pointerTileIndex')
        Tilesets.update(selectedTileset()._id, {
            $unset: { [`tiles.${pointerTileIndex}.layer`]: 2 },
        })
    })
    hotkeys('3', (event) => {
        event.preventDefault()
        const pointerTileIndex = Session.get('pointerTileIndex')
        Tilesets.update(selectedTileset()._id, {
            $set: { [`tiles.${pointerTileIndex}.layer`]: 3 },
        })
    })
    hotkeys('4', (event) => {
        event.preventDefault()
        const pointerTileIndex = Session.get('pointerTileIndex')
        Tilesets.update(selectedTileset()._id, {
            $set: { [`tiles.${pointerTileIndex}.layer`]: 4 },
        })
    })
    hotkeys('5', (event) => {
        event.preventDefault()
        const pointerTileIndex = Session.get('pointerTileIndex')
        Tilesets.update(selectedTileset()._id, {
            $set: { [`tiles.${pointerTileIndex}.layer`]: 5 },
        })
    })
    hotkeys('6', (event) => {
        event.preventDefault()
        const pointerTileIndex = Session.get('pointerTileIndex')
        Tilesets.update(selectedTileset()._id, {
            $set: { [`tiles.${pointerTileIndex}.layer`]: 6 },
        })
    })
    hotkeys('7', (event) => {
        event.preventDefault()
        const pointerTileIndex = Session.get('pointerTileIndex')
        Tilesets.update(selectedTileset()._id, {
            $set: { [`tiles.${pointerTileIndex}.layer`]: 7 },
        })
    })
    hotkeys('8', (event) => {
        event.preventDefault()
        const pointerTileIndex = Session.get('pointerTileIndex')
        Tilesets.update(selectedTileset()._id, {
            $set: { [`tiles.${pointerTileIndex}.layer`]: 8 },
        })
    })
})

Template.editorTilesets.onDestroyed(() => {
    hotkeys.unbind('c')
    hotkeys.unbind('0')
    hotkeys.unbind('1')
    hotkeys.unbind('2')
    hotkeys.unbind('3')
    hotkeys.unbind('4')
    hotkeys.unbind('5')
    hotkeys.unbind('6')
    hotkeys.unbind('7')
})

Template.editorTilesets.helpers({
    collisionTileIndexes() {
        const tileset = selectedTileset()
        return tileset?.collisionTileIndexes?.map((tileIndex, idx) => ({
            _id: `${tileset._id}-${idx}`,
            tileIndex,
        }))
    },
    tilesAsArray() {
        const tileset = selectedTileset()
        return Object.entries(tileset?.tiles || {}).map(([tileIndex, { layer }], idx) => ({
            _id: `${tileset._id}-${idx}`,
            tileIndex,
            layer,
        }))
    },
    displayTilesetPropertiesModal() {
        return Session.get('displayTilesetPropertiesModal')
    },
})

Template.editorTilesets.events({
    'dragover .js-drop-tileset, dragenter .js-drop-tileset': function () {
        Session.set('showDropZone', true)
    },
    'drag .js-drop-tileset, dragstart .js-drop-tileset, dragend .js-drop-tileset, dragover .js-drop-tileset, dragenter .js-drop-tileset, dragleave .js-drop-tileset, drop .js-drop-tileset':
        function (event) {
            event.preventDefault()
            event.stopPropagation()
        },
    'dragleave .js-drop-tileset, dragend .js-drop-tileset, drop .js-drop-tileset': function () {
        Session.set('showDropZone', false)
    },
    'drop .js-drop-tileset': function ({ originalEvent }) {
        const uploadedFiles = originalEvent.dataTransfer.files

        const maxTileset = Tilesets.findOne({}, { sort: { gid: -1 }, limit: 1 })
        let maxTilesetGid = 0
        if (maxTileset) maxTilesetGid = maxTileset.gid + 10000

        Array.from(uploadedFiles).forEach((file) => {
            if (!file) return

            const uploadInstance = Files.insert(
                {
                    file,
                    chunkSize: 'dynamic',
                    meta: {
                        source: 'editor-tilesets',
                        gid: maxTilesetGid,
                    },
                },
                false
            )

            uploadInstance.on('end', (error) => {
                if (error) lp.notif.error(`Error during upload: ${error.reason}`)
            })

            uploadInstance.start()
            maxTilesetGid += 10000
        })
    },
    'mousemove img': function (event) {
        const x = (event.offsetX / (16 * zoom)) | 0
        const y = (event.offsetY / (16 * zoom)) | 0
        const index = (y * selectedTileset().width) / 16 + x
        Session.set('pointerTileIndex', index)
    },
    'click img': function (event) {
        const x = (event.offsetX / (16 * zoom)) | 0
        const y = (event.offsetY / (16 * zoom)) | 0
        const index = (y * selectedTileset().width) / 16 + x
        Session.set('selectedTiles', {
            tilesetId: selectedTileset()._id,
            index,
        })
    },
    'click .js-tilesets-select': function () {
        Session.set('selectedTilesetId', this._id)
        Session.set('selectedEditTilesetId', undefined)
    },
    'dblclick .js-tilesets-select': function () {
        Session.set('selectedEditTilesetId', this._id)
    },
    'click .js-tileset-name': function (event) {
        event.preventDefault()
        event.stopImmediatePropagation()
    },
    'click .js-toggle-visibility': function (event) {
        Tilesets.update(this._id, {
            $set: { hidden: event.currentTarget.checked },
        })
    },
    'blur .js-tileset-name': function (event, templateInstance) {
        if (!Session.get('selectedEditTilesetId')) return
        Session.set('selectedEditTilesetId', undefined)
        const newName = templateInstance.$(`#${this._id}`).val().trim()
        if (newName?.length) Tilesets.update({ _id: this._id }, { $set: { name: newName } })
    },
    'keyup .js-tileset-name': function (event, templateInstance) {
        if (event.code === 'Escape') {
            Session.set('selectedEditTilesetId', undefined)
        }
        if (event.code === 'Enter') {
            templateInstance.$(`#${this._id}`).blur()
        }
    },
    'click .js-tileset-remove': function (event) {
        event.preventDefault()
        event.stopImmediatePropagation()
        lp.notif.confirm(
            'Tileset Deletion',
            `Are you sure to delete tileset "<b>${this.name}</b>" and its tiles?!?`,
            () => {
                Meteor.call('removeTileset', this._id, (err) => {
                    if (err) {
                        throw new Meteor.Error('tileset-remove-error', 'Error happened when delete a tileset')
                    }
                })
            }
        )
    },
})

Template.tilePropertiesModal.onCreated(function () {
    if (!Session.get('selectedTiles')) {
        Session.set('displayTilesetPropertiesModal', undefined)
        return
    }

    const selectedTilesIndex = Session.get('selectedTiles')?.index
    this.properties = {}
    if (selectedTileset().tiles) this.properties = selectedTileset().tiles[selectedTilesIndex] || {}
})

Template.tilePropertiesModal.helpers({
    properties() {
        const props = _.clone(Template.instance().properties)
        return JSON.stringify(props, ' ', 2)
    },
})

Template.tilePropertiesModal.events({
    'click .js-tile-properties-cancel': function () {
        Session.set('displayTilesetPropertiesModal', undefined)
    },
    'click .js-tile-properties-save': function () {
        if (!Session.get('selectedTiles')) return
        const selectedTilesIndex = Session.get('selectedTiles')?.index

        const properties = JSON.parse($('.modal.tile-properties-modal textarea').val())
        Tilesets.update(selectedTileset()._id, {
            $set: { [`tiles.${selectedTilesIndex}`]: properties },
        })
        Session.set('displayTilesetPropertiesModal', undefined)
    },
})
