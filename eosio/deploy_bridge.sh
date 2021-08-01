#!/usr/bin/env bash
# deploy bbs bridge
. env.sh


# deploy BBS token
. deploy_token.sh

# deploy bancorX
. deploy_bancorx.sh
