#!/usr/bin/env bash
export $(cat ../.env | xargs) && rails c

npx hardhat run socialRecovery.ts --network development