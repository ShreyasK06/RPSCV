import React, { useRef, useEffect, useState } from 'react';
import handDetection from './handDetection';

const StepByStepCameraFeed = ({ onMoveDetected, theme }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [handDetectionEnabled, setHandDetectionEnabled] = useState(true); // Auto-enable hand detection
  const [handDetectionReady, setHandDetectionReady] = useState(false);
  const [detectedMove, setDetectedMove] = useState('NONE');

  // Initialize camera
  useEffect(() => {
    let isMounted = true;
    const videoElement = videoRef.current;

    const setupCamera = async () => {
      try {
        console.log('Requesting camera access...');
        const constraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Camera access granted');

        // Check if component is still mounted
        if (!isMounted || !videoRef.current) return;

        // Set the video source
        videoRef.current.srcObject = stream;

        // Make sure canvas is properly sized
        if (canvasRef.current) {
          const videoTrack = stream.getVideoTracks()[0];
          const settings = videoTrack.getSettings();
          console.log('Video track settings:', settings);

          // Set canvas dimensions to match video
          canvasRef.current.width = settings.width || 640;
          canvasRef.current.height = settings.height || 480;
        }

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (!isMounted || !videoRef.current) return;
          console.log('Video metadata loaded, starting playback...');

          videoRef.current.play()
            .then(() => {
              console.log('Video playback started');
              if (isMounted) setCameraReady(true);
            })
            .catch(err => {
              console.error('Error playing video:', err);
              if (isMounted) setCameraError(true);
            });
        };

        // Also handle the canplay event as a backup
        videoRef.current.oncanplay = () => {
          console.log('Video can play event fired');
          if (videoRef.current && videoRef.current.paused) {
            console.log('Video was paused, attempting to play again');
            videoRef.current.play().catch(err => console.error('Error on canplay:', err));
          }
          if (isMounted) setCameraReady(true);
        };
      } catch (error) {
        console.error('Error setting up camera:', error);
        if (isMounted) setCameraError(true);
      }
    };

    setupCamera();

    // Cleanup function
    return () => {
      isMounted = false;
      // Stop all video streams
      if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Initialize hand detection when enabled
  useEffect(() => {
    let isMounted = true;
    let stopDetection = null;

    const setupHandDetection = async () => {
      if (!handDetectionEnabled || !cameraReady || !videoRef.current) return;

      try {
        console.log('Initializing hand detection...');
        const modelLoaded = await handDetection.loadModel();
        if (!modelLoaded) {
          throw new Error("Failed to load handpose model");
        }

        if (!isMounted) return;
        console.log('Hand detection model loaded successfully');

        // Set video element for hand detection
        handDetection.setVideoElement(videoRef.current);

        // Start hand detection
        stopDetection = handDetection.startDetection((move, landmarks, boundingBox) => {
          if (!isMounted) return;

          // Update the detected move
          setDetectedMove(move);

          // Call the parent callback
          if (onMoveDetected) {
            onMoveDetected(move);
          }

          // Draw hand landmarks on canvas if available
          if (landmarks && canvasRef.current) {
            drawHand(landmarks, boundingBox);
          }
        });

        setHandDetectionReady(true);
      } catch (error) {
        console.error('Error setting up hand detection:', error);
        if (isMounted) setHandDetectionReady(false);
      }
    };

    setupHandDetection();

    return () => {
      isMounted = false;
      if (stopDetection) stopDetection();
    };
  }, [handDetectionEnabled, cameraReady, onMoveDetected]);

  // Draw hand landmarks on canvas with a cleaner, more minimal style
  const drawHand = (landmarks, boundingBox) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Don't draw the semi-transparent overlay for a cleaner look

    // Draw a subtle bounding box
    if (boundingBox) {
      // Choose color based on detected move
      let boxColor;
      switch (detectedMove) {
        case 'ROCK': boxColor = 'rgba(255, 85, 85, 0.7)'; break;
        case 'PAPER': boxColor = 'rgba(85, 255, 85, 0.7)'; break;
        case 'SCISSOR': boxColor = 'rgba(85, 85, 255, 0.7)'; break;
        default: boxColor = 'rgba(255, 255, 255, 0.5)';
      }

      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 2;

      // Calculate bounding box with padding
      const padding = 20;
      const x = boundingBox.topLeft[0] - padding;
      const y = boundingBox.topLeft[1] - padding;
      const boxWidth = (boundingBox.bottomRight[0] - boundingBox.topLeft[0]) + (padding * 2);
      const boxHeight = (boundingBox.bottomRight[1] - boundingBox.topLeft[1]) + (padding * 2);

      // Draw rounded rectangle
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, 10);
      ctx.stroke();
    }

    // Draw hand skeleton with a more subtle style
    // First draw the connections (lines)
    for (let i = 1; i < landmarks.length; i++) {
      // Skip connections between different fingers
      if (i % 4 !== 1) {
        const [x, y] = landmarks[i];
        const [prevX, prevY] = landmarks[i - 1];

        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Then draw the points (joints)
    for (let i = 0; i < landmarks.length; i++) {
      const [x, y] = landmarks[i];

      // Draw smaller points for a cleaner look
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
    }

    // No text on the canvas for a cleaner look
  };

  return (
    <div className="camera-container">
      {cameraError ? (
        <div className="video-placeholder" id={`video${theme}`}>
          <div className="placeholder-content">
            <p>Camera access denied or not available</p>
            <p>Please allow camera access and refresh the page</p>
          </div>
        </div>
      ) : (
        <div className="video-wrapper">
          {/* Video element */}
          <video
            ref={videoRef}
            className="video"
            id={`video${theme}`}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '10px',
              display: 'block',
              transform: 'scaleX(-1)' // This flips the video horizontally
            }}
          />

          {/* Canvas overlay for hand detection */}
          {handDetectionEnabled && (
            <canvas
              ref={canvasRef}
              className="hand-canvas"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '10px',
                pointerEvents: 'none',
                transform: 'scaleX(-1)' // This flips the canvas to match the video
              }}
            />
          )}

          {/* Minimal move indicator */}
          {handDetectionEnabled && handDetectionReady && (
            <div className="minimal-move-indicator" style={{ transform: 'scaleX(-1)' }}>
              <div className={`move-badge ${detectedMove.toLowerCase()}`}>
                {detectedMove !== "NONE" ? detectedMove : ""}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StepByStepCameraFeed;
