const LocalUsers = new Mongo.Collection(null)

const _findOne = Meteor.users.findOne

Meteor.users.find = (...args) => LocalUsers.find(...args)

Meteor.users.findOne = (...args) => {
    if (Meteor.userId() && args.length && args[0] === Meteor.userId()) {
        return _findOne.call(Meteor.users, ...args)
    }
    return LocalUsers.findOne(...args)
}

const usersPollDiff = (oldUsers, newUsers, methods) => {
    newUsers.forEach((newUser) => {
        if (newUser._id === Meteor.userId()) newUser = Meteor.user()
        LocalUsers.upsert({ _id: newUser._id }, { $set: newUser })
        const oldUser = oldUsers.find((user) => user._id === newUser._id)
        if (oldUser && !_.isEqual(oldUser, newUser))
            methods.changed(newUser, oldUser)
        else if (!oldUser) methods.added(newUser)
    })

    oldUsers
        .filter((old) => !newUsers.some((user) => old._id === user._id))
        .forEach((deleteUser) => {
            LocalUsers.remove(deleteUser._id)
            methods.removed(deleteUser)
        })
}

class Polling {
    constructor() {
        this.interval = null
        this.idle = false
    }

    start(pollFunction, milliseconds) {
        this.interval = Meteor.setInterval(() => {
            if (!this.idle) {
                this.idle = true
                pollFunction()
            }
        }, milliseconds)
    }

    setIdle(idle) {
        this.idle = idle
    }

    stop() {
        clearInterval(this.interval)
    }
}

export { usersPollDiff, Polling }
