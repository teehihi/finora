const { withPodfileProperties } = require('expo/config-plugins');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

const pin = {
  name: 'CYLTabBarController/Core',
  git: 'https://github.com/ChenYilong/CYLTabBarController.git',
  commit: '960dc211d829d540e5249cf13b6e8ec1b24fbca2',
  modular_headers: true,
  configurations: ['Debug'],
};

module.exports = (config) =>
  withPodfileProperties(config, (mod) => {
    const enabled = existsSync(join(mod.modRequest.projectRoot, 'modules/finora-cyl-dock'));
    const key = 'apple.extraPods';
    const previous = JSON.parse(mod.modResults[key] || '[]');
    const pods = previous.filter((pod) => pod.name !== pin.name);
    if (enabled) pods.push(pin);
    if (pods.length) mod.modResults[key] = JSON.stringify(pods);
    else delete mod.modResults[key];
    return mod;
  });
