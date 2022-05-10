#!/bin/bash

VERSION=$(node -p -e "require('./package.json').version")
echo "$VERSION" > .version
