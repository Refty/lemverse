viewportModes = Object.freeze({
  fullscreen: 'fullscreen',
  small: 'small',
  splitScreen: 'split-screen',
});

relativePositionToCamera = (position, camera) => {
  const { worldView, zoom } = camera;
  return { x: (position.x - worldView.x) * zoom, y: (position.y - worldView.y) * zoom };
};

updateViewport = (scene, mode) => {
  if (typeof mode !== 'string') mode = scene.viewportMode;

  if (mode === viewportModes.small) scene.cameras.main.setViewport(0, 0, window.innerWidth / 3, window.innerHeight);
  else if (mode === viewportModes.splitScreen) scene.cameras.main.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
  else scene.cameras.main.setViewport(0, 0, window.innerWidth, window.innerHeight);

  scene.viewportMode = mode;
};

formatURL = url => {
  let formattedURL;
  try {
    formattedURL = new URL(url);
  } catch (err) {
    return undefined;
  }

  return formattedURL;
};

sendDataToNearUsers = (type, data, emitterId) => new Promise((resolve, reject) => {
  const { nearUsers } = userProximitySensor;
  let targets = [...new Set(_.keys(nearUsers))];
  targets = targets.filter(target => target !== Meteor.userId());
  if (!targets.length) return reject(new Error('no-targets'));

  return peer.sendData(targets, { type, emitter: emitterId, data })
    .then(resolve)
    .catch(reject);
});