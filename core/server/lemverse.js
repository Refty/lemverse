import crypto from 'crypto'

Accounts.emailTemplates.from = Meteor.settings.email.from
AccountsGuest.enabled = true
AccountsGuest.forced = true
AccountsGuest.name = true

Meteor.publish('tiles', function (levelId) {
    check(levelId, Match.Maybe(String))
    if (!this.userId) return undefined
    if (!levelId) levelId = Meteor.settings.defaultLevelId

    return Tiles.find(
        { levelId, invisible: { $ne: true } },
        { fields: { index: 1, x: 1, y: 1, tilesetId: 1, metadata: 1 } }
    )
})

Meteor.publish('characters', function () {
    if (!this.userId) return undefined

    return Characters.find()
})

lp.defer(() => {
    if (Levels.find().count() > 0) return

    log('creating default level')
    Levels.insert({
        _id: Meteor.settings.defaultLevelId,
        name: 'Default level',
        spawn: { x: 200, y: 200 },
        createdAt: new Date(),
    })
})

const allFilesName = ['favicon.png', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png']

Meteor.startup(() => {
    const { faviconURL, logoURL } = Meteor.settings.public.lp

    // Check if logo already exist
    const logoHash = crypto.createHash('sha256').update(logoURL).digest('hex')
    if (!Files.findOne({ meta: { hash: logoHash } })) {
        // otherwise delete current logo to replace it
        Files.remove({ name: 'logo.png' }, (error) => {
            if (error) log('FilesCollection: error occured while removing logo', error)
            Files.load(
                logoURL,
                {
                    fileName: 'logo.png',
                    fileId: 'logo',
                    meta: { hash: logoHash },
                },
                () => {},
                true
            )
        })
    }

    // Check if favicon already exist
    const faviconHash = crypto.createHash('sha256').update(faviconURL).digest('hex')
    if (!Files.findOne({ meta: { hash: faviconHash, source: 'favicon' } })) {
        // otherwise delete all related favicons to regenerate them
        Files.remove({ name: { $in: allFilesName } }, (error) => {
            if (error) log('FilesCollection: error occured while removing favicon', error)
            Files.load(
                faviconURL,
                {
                    fileName: 'favicon.png',
                    fileId: 'favicon',
                    meta: { hash: faviconHash, source: 'favicon' },
                },
                () => {},
                true
            )
        })
    }
})
