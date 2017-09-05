#!/bin/bash

rm -r dist
npm install
npm run package-mac
npm run create-installer-mac
