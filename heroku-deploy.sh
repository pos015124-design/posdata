#!/bin/bash

# Script to deploy Dukani System to Heroku

echo "Deploying Dukani System to Heroku..."

# Ensure we have the latest changes
git add .
git commit -m "Fix Heroku deployment configuration"

# Push to Heroku
git push heroku main

echo "Deployment complete. Check the logs with: heroku logs --tail"