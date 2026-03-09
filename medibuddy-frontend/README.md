# React + Vite

<<<<<<< HEAD
This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.
=======
## Project Overview
MediBuddy is a healthcare web application built using React (Vite) and Node.js (Express).  
The system allows users to manage profiles, medications, and appointments securely using OTP-based authentication.
>>>>>>> 96af074 (Initial comit)

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rollup-vite](https://vite.dev/guide/rollup)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Features Implemented

<<<<<<< HEAD
Frontend runs at:

http://localhost:5173

## Backend Requirement

Make sure backend is running at:

http://localhost:5000

## OTP Development Mode

For development, OTP is NOT sent via SMS.

Instead:

1. Click "Send OTP"
2. Check backend terminal
3. Copy the OTP printed in the console
4. Enter it in the verify page

Twilio is disabled in development to avoid SMS charges.

## Features

- OTP Authentication
- Profiles CRUD
- Medications CRUD
- Appointments CRUD
- Protected routes
=======
### 🔐 Authentication
- OTP-based login
- JWT access & refresh token handling
- Protected routes
- Logout functionality

### 👤 Profile Management
- Create profile
- View profiles
- Edit profile
- Delete profile
- Data persists in MongoDB

### 💊 Medication Management
- Add medication
- View medications per selected profile
- Delete medication
- Data stored in MongoDB

### 📅 Appointment Management
- Create appointment
- View appointments
- Edit appointment
- Delete appointment

---

## Technical Stack

### Frontend
- React (Vite)
- React Router
- Axios
- Context API

### Backend
- Node.js
- Express
- MongoDB (Mongoose)
- JWT Authentication

---

## Project Structure
>>>>>>> 96af074 (Initial comit)
