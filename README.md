# DialedIn - Fitness Workout App

A React Native fitness app that provides personalized workout plans and tracks your fitness progress.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local installation or MongoDB Atlas account)
- Expo CLI (`npm install -g expo-cli`)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DialedIn
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update the following variables in `.env`:
     ```
     MONGODB_URI=mongodb://localhost:27017/dialedin
     PORT=3000
     JWT_SECRET=your_secret_key_here
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

4. **Set up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - If using local MongoDB, make sure it's running on port 27017
   - If using MongoDB Atlas, update the MONGODB_URI in `.env` with your connection string

5. **Get a Gemini API key**
   - Go to https://makersuite.google.com/app/apikey
   - Create a new API key
   - Add the key to your `.env` file

6. **Start the backend server**
   ```bash
   npm start
   # or
   yarn start
   ```

7. **Start the Expo development server**
   ```bash
   npx expo start
   ```

8. **Run the app**
   - Press 'i' to run on iOS simulator
   - Press 'a' to run on Android emulator
   - Scan the QR code with Expo Go app on your physical device

## Physical Device Testing

If you want to test the app on a physical device:

1. Find your computer's local IP address:
   - On macOS/Linux: `ifconfig` or `ip addr`
   - On Windows: `ipconfig`

2. Update the API_URL in `config.js`:
   ```javascript
   export const API_URL = 'http://YOUR_LOCAL_IP:3000/api';
   ```

3. Make sure your phone is on the same WiFi network as your computer

## Troubleshooting

- **MongoDB Connection Issues**: Make sure MongoDB is running and accessible
- **API Connection Issues**: Check that the backend server is running and the API_URL is correct
- **Expo Build Issues**: Try clearing the Expo cache with `expo start -c`
- **Missing Video Files**: The app will still work without video files, but exercise demonstrations won't be available

## Project Structure

- `/app` - React Native screens and components
- `/routes` - Backend API routes
- `/models` - MongoDB models
- `/config` - Configuration files
- `/components` - Reusable React components

## License

[Your License Here]
