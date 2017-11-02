#!/usr/bin/env node
var fs = require('fs-extra');
var path = require('path');
var utils = require('./utils');

/**
 * Add an extension to the source tree of JupyterLab.
 * It takes as an argument either a path to a directory
 * on the local filesystem or a URL to a git repository.
 * In the former case, it copies the directory into the
 * source tree, in the latter it adds the repository as
 * a git submodule.
 *
 * It also adds the relevant metadata to the build files.
 */

// Make sure we have required command line arguments.
if (process.argv.length < 3) {
    var msg = '** Must supply a target extension';
    process.stderr.write(msg);
    process.exit(1);
}

// Extract the desired git repository and repository name.
var target = process.argv[2];
var basePath = path.resolve('.');
var packageDirName;

var packagePath = '';
if (target[0] === '.' || target[0] === '/') {
  // If the target starts with a '.' or a '/', treat it as a local path.
  packagePath = path.resolve(target);
  // Possibly remove a trailing slash.
  if (packagePath[packagePath.length-1] === '/') {
    packagePath = packagePath.slice(0, -1);
  }
  packageDirName = packagePath.split('/').pop();
  // Copy the package directory contents to the sibling package.
  var newPackagePath = path.join(basePath, 'packages', packageDirName);
  fs.copySync(packagePath, newPackagePath);
} else {
  // Otherwise treat it as a git reposotory and try to add it.
  packageDirName = target.split('/').pop().split('.')[0];
  var packagePath = path.join(basePath, 'packages', packageDirName);
  // Add the repository as a submodule.
  childProcess.execSync('git clone '+ target + ' ' + packagePath);
}

// Remove any existing node_modules in the extension.
if (fs.existsSync(path.join(packagePath, 'node_modules'))) {
  fs.removeSync(path.join(packagePath, 'node_modules'));
}

// Add the extension path to packages/all-packages/tsconfig.json
var tsconfigPath = path.join(basePath, 'packages', 'all-packages', 'tsconfig.json');
var tsconfig = require(tsconfigPath);
tsconfig.compilerOptions.paths[package.name] = [path.join('..', packageDirName, 'src')];
fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');

// Update the core jupyterlab build dependencies.
utils.run('npm run update:core');

// Update the lerna symlinks.
utils.run('npm install');
