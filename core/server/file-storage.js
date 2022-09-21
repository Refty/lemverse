// Taken from https://github.com/VeliovGroup/Meteor-Files/blob/master/docs/aws-s3-integration.md
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Random } from 'meteor/random';
import { FilesCollection } from 'meteor/ostrio:files';
import stream from 'stream';

import S3 from 'aws-sdk/clients/s3'; /* http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html */
/* See fs-extra and graceful-fs NPM packages */
/* For better i/o performance */
import fs from 'fs';

const s3Conf = Meteor.settings.s3 || {};
const bound = Meteor.bindEnvironment(callback => callback());

if (s3Conf && s3Conf.key && s3Conf.secret && s3Conf.bucket && s3Conf.region) {
  const s3 = new S3({
    secretAccessKey: s3Conf.secret,
    accessKeyId: s3Conf.key,
    region: s3Conf.region,
    // sslEnabled: true, // optional
    httpOptions: {
      timeout: 6000,
      agent: false,
    },
  });

  // Declare the Meteor file collection on the Server
  const UserFiles = new FilesCollection({
    debug: false,
    storagePath: 'assets/app/uploads/uploadedFiles', // FIXME: find the real path used by lemverse
    collectionName: 'lemverseFiles',
    allowClientCode: false, // Disallow Client to execute remove, use the Meteor.method

    // Start moving files to AWS:S3
    // after fully received by the Meteor server
    onAfterUpload(fileRef) {
      _.each(fileRef.versions, (vRef, version) => {
        const filePath = `files/${Random.id()}-${version}.${fileRef.extension}`;
        s3.putObject({
          // ServerSideEncryption: 'AES256', // Optional
          StorageClass: 'STANDARD',
          Bucket: s3Conf.bucket,
          Key: filePath,
          Body: fs.createReadStream(vRef.path),
          ContentType: vRef.type,
        }, error => {
          bound(() => {
            if (error) {
              // FIXME: pretty sure it's bad practice to report an error without throwing it, but do we really want to crash the server?
              // Yet i'm not sure how Meteor recovers from an error thrown in a callback
              Meteor.Error(error);
            } else {
              // Update FilesCollection with link to the file at AWS
              const update = { $set: {} };
              update.$set[`versions.${version}.meta.pipePath`] = filePath;

              this.collection.update({
                _id: fileRef._id,
              }, update, updError => {
                if (updError) {
                  Meteor.Error(error);
                } else {
                  // Unlink original files from FS after successful upload to AWS:S3
                  this.unlink(this.collection.findOne(fileRef._id), version);
                }
              });
            }
          });
        });
      });
    },


    // FIXME: use direct CDN link instead intercepting Downloads
    // It's faster and cheaper

    // Intercept access to the file
    // And redirect request to AWS:S3
    interceptDownload(http, fileRef, version) {
      let path;

      if (fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipePath) {
        path = fileRef.versions[version].meta.pipePath;
      }

      if (path) {
        const opts = {
          Bucket: s3Conf.bucket,
          Key: path,
        };

        if (http.request.headers.range) {
          const vRef = fileRef.versions[version];
          const range = _.clone(http.request.headers.range);
          const array = range.split(/bytes=([0-9]*)-([0-9]*)/);
          const start = parseInt(array[1], 10);
          let end = parseInt(array[2], 10);
          if (Number.isNaN(end)) {
            // Request data from AWS:S3 by small chunks
            end = (start + this.chunkSize) - 1;
            if (end >= vRef.size) {
              end = vRef.size - 1;
            }
          }
          opts.Range = `bytes=${start}-${end}`;
          http.request.headers.range = `bytes=${start}-${end}`;
        }

        const fileColl = this;
        s3.getObject(opts, function (error) {
          if (error) {
            Meteor.Error(error);
            if (!http.response.finished) {
              http.response.end();
            }
          } else {
            if (http.request.headers.range && this.httpResponse.headers['content-range']) {
              // Set proper range header in according to what is returned from AWS:S3
              http.request.headers.range = this.httpResponse.headers['content-range'].split('/')[0].replace('bytes ', 'bytes=');
            }

            const dataStream = new stream.PassThrough();
            fileColl.serve(http, fileRef, fileRef.versions[version], version, dataStream);
            dataStream.end(this.data.Body);
          }
        });

        return true;
      }
      // While file is not yet uploaded to AWS:S3
      // It will be served file from FS
      // Which means that adding extra tileset during an event would not be wise
      return false;
    },
  });

  // Monkeypatch the remove method
  // to also remove the file from AWS:S3
  // else we would have trailling files on AWS:S3
  const _origRemove = UserFiles.remove;
  UserFiles.remove = function (search) {
    const cursor = this.collection.find(search);
    cursor.forEach(fileRef => {
      _.each(fileRef.versions, vRef => {
        if (vRef && vRef.meta && vRef.meta.pipePath) {
          // Remove the object from AWS:S3 first, then we will call the original FilesCollection remove
          s3.deleteObject({
            Bucket: s3Conf.bucket,
            Key: vRef.meta.pipePath,
          }, error => {
            bound(() => {
              if (error) {
                Meteor.Error(error);
              }
            });
          });
        }
      });
    });

    // remove original file from database
    _origRemove.call(this, search);
  };
}
