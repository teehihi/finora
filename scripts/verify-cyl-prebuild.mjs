import assert from 'node:assert/strict';
import { lstatSync, readFileSync } from 'node:fs';

const app = new URL('../apps/app/', import.meta.url);
const read = (file) => JSON.parse(readFileSync(new URL(file, app), 'utf8'));
const moduleDir = 'modules/finora-cyl-dock/';
assert.ok(lstatSync(new URL(moduleDir.slice(0, -1), app)).isDirectory());
const module = read(moduleDir + 'expo-module.config.json');
assert.deepEqual(module.platforms, ['apple']);
assert.deepEqual(module.apple.modules, ['FinoraCYLDockModule']);
assert.notEqual(module.apple.debugOnly, true, 'FinoraCYLDock must also link into Release');

const properties = read('ios/Podfile.properties.json');
const pods = JSON.parse(properties['apple.extraPods']);
const cyl = pods.filter((pod) => pod.name === 'CYLTabBarController/Core');
assert.equal(cyl.length, 1, 'Exactly one CYL Core declaration is required');
assert.equal(cyl[0].git, 'https://github.com/ChenYilong/CYLTabBarController.git');
assert.match(cyl[0].commit, /^[a-f0-9]{40}$/);
assert.equal(cyl[0].configurations, undefined, 'The CYL pod must not be Debug-only');
assert.equal(cyl[0].modular_headers, true);
console.log('CYL release prebuild: local iOS module and pinned pod enabled for all configurations');
