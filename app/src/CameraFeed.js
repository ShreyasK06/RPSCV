import React, { useRef, useEffect, useState } from 'react';
import handDetection from './handDetection';

const CameraFeed = ({ onMoveDetected, theme }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);

  // Initialize camera and model
  useEffect(() => {
    const setupCamera = async () => {
      try {
        // Load the handpose model
        setModelLoading(true);
        const modelLoaded = await handDetection.loadModel();
        if (!modelLoaded) {
          throw new Error("Failed to load handpose model");
        }
        
        // Access the webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          }
        });
        
        // Set the video source
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          handDetection.setVideoElement(videoRef.current);
          
          // Start hand detection
          handDetection.startDetection((move, landmarks, boundingBox) => {
            // Update the parent component with the detected move
            onMoveDetected(move);
            
            // Draw hand landmarks on canvas if available
            if (landmarks && canvasRef.current) {
              drawHand(landmarks, boundingBox);
            }
          });
        }
        
        setModelLoading(false);
      } catch (error) {
        console.error("Error setting up camera:", error);
        setCameraError(true);
        setModelLoading(false);
      }
    };
    
    setupCamera();
    
    // Cleanup function
    return () => {
      // Stop all video streams
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [onMoveDetected]);
  
  // Draw hand landmarks on canvas
  const drawHand = (landmarks, boundingBox) => {
    const ctx = canvasRef.current.getContext('2d');
    const { width, height } = canvasRef.current;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw bounding box
    if (boundingBox) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      
      // Calculate bounding box with padding
      const padding = 20;
      const x = boundingBox.topLeft[0] - padding;
      const y = boundingBox.topLeft[1] - padding;
      const boxWidth = (boundingBox.bottomRight[0] - boundingBox.topLeft[0]) + (padding * 2);
      const boxHeight = (boundingBox.bottomRight[1] - boundingBox.topLeft[1]) + (padding * 2);
      
      ctx.strokeRect(x, y, boxWidth, boxHeight);
    }
    
    // Draw landmarks
    for (let i = 0; i < landmarks.length; i++) {
      const [x, y] = landmarks[i];
      
      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#FF0000';
      ctx.fill();
      
      // Connect points with lines
      if (i > 0 && i % 4 !== 0) {
        const [prevX, prevY] = landmarks[i - 1];
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    
    // Draw move text
    ctx.font = '24px Arial';
    ctx.fillStyle = '#00FF00';
    ctx.fillText(`Move: ${handDetection.getCurrentMove()}`, 10, 30);
  };

  return (
    <div className="camera-container">
      {cameraError ? (
        <div className="video-placeholder" id={`video${theme}`}>
          <div className="placeholder-content">
            <p>Camera access denied or not available</p>
            <p>Please allow camera access and refresh the page</p>
            <p>Or use keyboard controls:</p>
            <p><strong>R</strong> - Rock | <strong>P</strong> - Paper | <strong>S</strong> - Scissors</p>
          </div>
        </div>
      ) : modelLoading ? (
        <div className="video-placeholder" id={`video${theme}`}>
          <div className="placeholder-content">
            <p>Loading hand detection model...</p>
            <p>This may take a moment</p>
          </div>
        </div>
      ) : (
        <div className="video-wrapper">
          <video
            ref={videoRef}
            className="video"
            id={`video${theme}`}
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="hand-canvas"
            width={640}
            height={480}
          />
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
