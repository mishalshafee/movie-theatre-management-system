@echo off
title CineLux Cinema System
echo ====================================================
echo           CineLux Cinema Management System
echo ====================================================
echo Starting Backend Server on http://localhost:4000 ...
cd backend
start "" http://localhost:4000/backendshow.html
npm run dev
pause

