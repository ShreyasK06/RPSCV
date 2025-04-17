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

    // Gesture stabilization
    this.moveHistory = [];
    this.historySize = 10; // Number of frames to consider for stabilization
    this.confidenceThreshold = 0.6; // Minimum confidence to change gesture
  }

  async loadModel() {
    try {
      console.log("Loading handpose model...");
      // Configure model with lower confidence threshold for better detection
      const modelConfig = {
        detectionConfidence: 0.5,
        maxContinuousChecks: 5,
        iouThreshold: 0.3,
        scoreThreshold: 0.75
      };

      this.model = await handpose.load(modelConfig);
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

  // Detect moves based on hand landmarks
  detectMoves(landmarks) {
    if (!landmarks || landmarks.length === 0) return "NONE";

    // Convert landmarks array to a format similar to the Python version
    const hl = landmarks.map(point => ({
      x: point[0],
      y: point[1],
      z: point[2]
    }));

    // Log the landmarks for debugging
    console.log('Hand landmarks detected');

    // Calculate finger states (extended or not)
    // Thumb
    const thumbExtended = hl[4].x > hl[3].x + 20; // For right hand

    // Index finger
    const indexExtended = hl[8].y < hl[6].y;

    // Middle finger
    const middleExtended = hl[12].y < hl[10].y;

    // Ring finger
    const ringExtended = hl[16].y < hl[14].y;

    // Pinky finger
    const pinkyExtended = hl[20].y < hl[18].y;

    // Log finger states for debugging
    console.log('Finger states:', {
      thumbExtended,
      indexExtended,
      middleExtended,
      ringExtended,
      pinkyExtended
    });

    // ROCK: All fingers are curled except maybe the thumb
    const isRock = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;

    // PAPER: All fingers are extended
    const isPaper = indexExtended && middleExtended && ringExtended && pinkyExtended;

    // SCISSORS: Index and middle fingers extended, others curled
    const isScissors = indexExtended && middleExtended && !ringExtended && !pinkyExtended;

    // Log detected gestures
    console.log('Detected gestures:', { isRock, isPaper, isScissors });

    // Return the detected move with priority (if multiple gestures are detected)
    if (isRock) return "ROCK";
    if (isScissors) return "SCISSOR";
    if (isPaper) return "PAPER";

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

    // Use a flag to prevent multiple concurrent detections
    let isDetecting = false;

    const detectHands = async () => {
      if (!isRunning) return;

      // Skip if already processing a frame
      if (isDetecting) {
        requestAnimationFrame(detectHands);
        return;
      }

      // Check if video is ready
      if (this.videoElement && this.videoElement.readyState === 4) {
        try {
          isDetecting = true;

          // Get hand predictions
          const predictions = await this.model.estimateHands(this.videoElement);

          // Reset flag after detection
          isDetecting = false;

          if (predictions && predictions.length > 0) {
            // Get landmarks from the first detected hand
            const landmarks = predictions[0].landmarks;

            // Detect the raw move
            const rawMove = this.detectMoves(landmarks);

            // Stabilize the move
            const stableMove = this.stabilizeMove(rawMove);

            // Call the callback with the stabilized move and landmarks
            if (callback && isRunning) {
              callback(stableMove, landmarks, predictions[0].boundingBox);
            }
          } else {
            // Stabilize with "NONE" when no hand is detected
            const stableMove = this.stabilizeMove("NONE");
            if (callback && isRunning) {
              callback(stableMove, null, null);
            }
          }
        } catch (error) {
          console.error("Error during hand detection:", error);
          // Reset flag on error
          isDetecting = false;

          // Still call callback with stabilized NONE to ensure UI updates
          if (callback && isRunning) {
            const stableMove = this.stabilizeMove("NONE");
            callback(stableMove, null, null);
          }
        }
      } else if (this.videoElement) {
        console.log("Video not ready, readyState:", this.videoElement.readyState);
      }

      // Continue detection loop with a slight delay to reduce CPU usage
      if (isRunning) {
        setTimeout(() => requestAnimationFrame(detectHands), 100);
      }
    };

    detectHands();

    // Return a function to stop detection
    return () => {
      isRunning = false;
    };
  }

  // Stabilize the detected move using a history of recent detections
  stabilizeMove(move) {
    // Add the new move to history
    this.moveHistory.push(move);

    // Keep only the most recent moves
    if (this.moveHistory.length > this.historySize) {
      this.moveHistory.shift();
    }

    // Count occurrences of each move in history
    const moveCounts = {};
    this.moveHistory.forEach(m => {
      moveCounts[m] = (moveCounts[m] || 0) + 1;
    });

    // Find the most frequent move
    let maxCount = 0;
    let stableMove = "NONE";

    for (const [m, count] of Object.entries(moveCounts)) {
      if (count > maxCount) {
        maxCount = count;
        stableMove = m;
      }
    }

    // Calculate confidence (percentage of frames with this move)
    const confidence = maxCount / this.moveHistory.length;

    // Only change the current move if confidence is high enough
    if (confidence >= this.confidenceThreshold || this.currentMove === "NONE") {
      this.currentMove = stableMove;
    }

    console.log(`Move: ${move}, Stable: ${this.currentMove}, Confidence: ${confidence.toFixed(2)}`);

    return this.currentMove;
  }

  // Get the current detected move
  getCurrentMove() {
    return this.currentMove;
  }
}

// Create and export a singleton instance
const handDetection = new HandDetection();
export default handDetection;
