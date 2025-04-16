// Import TensorFlow.js and handpose model
import '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

class HandDetection {
  constructor() {
    this.model = null;
    this.videoElement = null;
    this.currentMove = "NONE";
    this.isModelLoaded = false;
    this.marginS = 0.075; // Same as Python margin_s
    this.marginP = 0.1;   // Same as Python margin_p
  }

  async loadModel() {
    try {
      console.log("Loading handpose model...");
      this.model = await handpose.load();
      this.isModelLoaded = true;
      console.log("Handpose model loaded successfully");
      return true;
    } catch (error) {
      console.error("Error loading handpose model:", error);
      return false;
    }
  }

  setVideoElement(videoElement) {
    this.videoElement = videoElement;
  }

  // Detect moves based on hand landmarks (similar to Python detectMoves function)
  detectMoves(landmarks) {
    if (!landmarks || landmarks.length === 0) return "NONE";

    // Convert landmarks array to a format similar to the Python version
    const hl = landmarks.map(point => ({
      x: point[0],
      y: point[1],
      z: point[2]
    }));

    // Check for rock gesture (thumb is tucked)
    const rock = hl[6].y > hl[4].y;

    // Check for scissors gesture (index and middle finger extended)
    const scissor =
      Math.abs(hl[4].x - hl[16].x) < this.marginS &&
      Math.abs(hl[4].x - hl[20].x) < this.marginS &&
      Math.abs(hl[16].x - hl[20].x) < this.marginS;

    // Check for paper gesture (all fingers extended)
    const paper =
      Math.abs(hl[6].y - hl[10].y) < this.marginP &&
      Math.abs(hl[6].y - hl[14].y) < this.marginP &&
      Math.abs(hl[6].y - hl[19].y) < this.marginP &&
      Math.abs(hl[10].y - hl[14].y) < this.marginP &&
      Math.abs(hl[10].y - hl[19].y) < this.marginP &&
      Math.abs(hl[14].y - hl[19].y) < this.marginP &&
      hl[4].y < hl[5].y + this.marginS &&
      hl[4].y > hl[6].y + this.marginS;

    if (rock) return "ROCK";
    if (scissor) return "SCISSOR";
    if (paper) return "PAPER";
    return "NONE";
  }

  // Start detecting hands in the video stream
  async startDetection(callback) {
    if (!this.model) {
      console.error("Handpose model not loaded");
      return;
    }

    if (!this.videoElement) {
      console.error("Video element not set");
      return;
    }

    console.log("Starting hand detection...");
    let isRunning = true;

    const detectHands = async () => {
      if (!isRunning) return;

      // Check if video is ready
      if (this.videoElement.readyState === 4) {
        try {
          // Get hand predictions
          const predictions = await this.model.estimateHands(this.videoElement);

          if (predictions && predictions.length > 0) {
            // Get landmarks from the first detected hand
            const landmarks = predictions[0].landmarks;

            // Detect the move
            const move = this.detectMoves(landmarks);
            this.currentMove = move;

            // Call the callback with the detected move and landmarks
            if (callback) {
              callback(move, landmarks, predictions[0].boundingBox);
            }
          } else {
            this.currentMove = "NONE";
            if (callback) {
              callback("NONE", null, null);
            }
          }
        } catch (error) {
          console.error("Error during hand detection:", error);
          // Still call callback with NONE to ensure UI updates
          if (callback) {
            callback("NONE", null, null);
          }
        }
      } else {
        console.log("Video not ready, readyState:", this.videoElement.readyState);
      }

      // Continue detection loop
      requestAnimationFrame(detectHands);
    };

    detectHands();

    // Return a function to stop detection
    return () => {
      isRunning = false;
    };
  }

  // Get the current detected move
  getCurrentMove() {
    return this.currentMove;
  }
}

// Create and export a singleton instance
const handDetection = new HandDetection();
export default handDetection;
