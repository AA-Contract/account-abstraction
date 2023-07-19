#!/usr/bin/env bash
export $(cat ../.env | xargs) && rails c

npx hardhat run test_main.ts --network localhost
