import { Meteor } from 'meteor/meteor';
import { UserStatus } from '../server/status';
import { TEST_IP, TEST_userId } from './setup';

/*
  Manual tests to do:

  logged out -> logged in
  logged in -> logged out
  logged in -> close session -> reopen
  logged in -> connection timeout
*/

// Publish status to client
Meteor.publish(null, () => Meteor.users.find({}, {
  fields: {
    status: 1
  }
}));

Meteor.methods({
  'grabStatus'() {
    return Meteor.users.find({
      _id: {
        $ne: TEST_userId
      }
    }, {
      fields: {
        status: 1
      }
    }).fetch();
  },
  'grabSessions'() {
    // Only grab sessions not generated by server-side tests.
    return UserStatus.connections.find({
      $and: [{
          userId: {
            $ne: TEST_userId
          }
        },
        {
          ipAddr: {
            $ne: TEST_IP
          }
        }
      ]
    }).fetch();
  }
});
