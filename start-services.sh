#!/bin/bash
# Start chat service
cd /home/z/my-project/mini-services/chat-service
bun --hot index.ts &
CHAT_PID=$!

# Start Next.js dev server
cd /home/z/my-project
bun next dev -p 3000 &
NEXT_PID=$!

# Wait for either to exit
wait
