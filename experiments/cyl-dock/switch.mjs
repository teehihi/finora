// Only create/remove our own symlink. Never delete or overwrite a native project.
import { lstat, mkdir, readlink, symlink, unlink } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('./native', import.meta.url));
const target = fileURLToPath(new URL('../../apps/app/modules/finora-cyl-dock', import.meta.url));
const mode = process.argv[2];
if (!['enable', 'disable'].includes(mode)) throw new Error('Use: node switch.mjs enable|disable');
const exists = await lstat(target).catch((error) => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
if (
  exists &&
  (!exists.isSymbolicLink() || resolve(dirname(target), await readlink(target)) !== source)
) {
  throw new Error('Refusing to replace an unrelated local module: ' + target);
}
if (mode === 'enable' && !exists) {
  await mkdir(dirname(target), { recursive: true });
  await symlink(relative(dirname(target), source), target, 'dir');
}
if (mode === 'disable' && exists) await unlink(target);
console.log(
  'CYL local iOS module: ' +
    mode +
    'd. Regenerate the pilot iOS project after changing this setting.',
);
