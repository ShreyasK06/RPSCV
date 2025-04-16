# Rock Paper Scissors Computer Vision (RPSCV)

A Rock Paper Scissors game that uses computer vision to detect hand gestures.

## Live Demo

You can try a limited version of the game on GitHub Pages: [https://shreyask06.github.io/RPSCV](https://shreyask06.github.io/RPSCV)

**Note:** The GitHub Pages version does not include the computer vision functionality. Instead, you can use keyboard controls (R, P, S) to play.

## Features

- Hand gesture recognition using computer vision (when running locally)
- Keyboard controls for GitHub Pages version (R, P, S keys)
- Light and dark theme
- Responsive design
- Score tracking
- Game timer
- Help overlay

## Running Locally (Full Version)

To run the full version with computer vision:

### Prerequisites

- Python 3.7+
- Node.js and npm

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/ShreyasK06/RPSCV.git
   cd RPSCV
   ```

2. Set up the Python backend:
   ```
   cd python
   pip install -r requirements.txt
   python app.py
   ```
   This will start the Flask server on http://localhost:5000

3. In a new terminal, set up the React frontend:
   ```
   cd app
   npm install
   npm start
   ```
   This will start the React app on http://localhost:3000

4. Open your browser and navigate to http://localhost:3000

## Deployment

The project is configured for GitHub Pages deployment:

```
cd app
npm run deploy
```

This will build the React app and deploy it to GitHub Pages.

## How It Works

### Local Version
1. The Python backend uses OpenCV to detect hand gestures from your webcam
2. The Flask server provides an API endpoint for the React app to get the detected gesture
3. The React app displays the video feed and game interface

### GitHub Pages Version
1. Uses keyboard controls instead of computer vision
2. Press R for Rock, P for Paper, or S for Scissors
3. The rest of the game works the same way

## Technologies Used

- React.js
- Flask
- OpenCV
- CSS3
- GitHub Pages

## License

This project is licensed under the MIT License - see the LICENSE file for details.
