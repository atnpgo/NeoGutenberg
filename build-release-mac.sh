#!/bin/bash

rm -r dist
mkdir dist
npm install
npm run package-mac
npm run create-installer-mac
