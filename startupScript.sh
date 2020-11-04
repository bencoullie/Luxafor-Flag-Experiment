#!/usr/bin/env bash
# stops the execution of a script if a command or pipeline has an error
set -e

# Enable NVM use
export NVM_DIR=$HOME/.nvm;
source $NVM_DIR/nvm.sh;

# Set correct node version
nvm use

# Execute watcher
node ./index.js