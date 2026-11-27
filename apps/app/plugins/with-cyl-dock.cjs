const { withPodfileProperties } = require('expo/config-plugins');

const pin = {
  name: 'CYLTabBarController/Core',
  git: 'https://github.com/ChenYilong/CYLTabBarController.git',
  commit: '960dc211d829d540e5249cf13b6e8ec1b24fbca2',
  modular_headers: true,
};

module.exports = (config) =>
  withPodfileProperties(config, (mod) => {
    const key = 'apple.extraPods';
    const previous = JSON.parse(mod.modResults[key] || '[]');
    const pods = previous.filter((pod) => pod.name !== pin.name);
    pods.push(pin);
    mod.modResults[key] = JSON.stringify(pods);
    return mod;
  });
