import React, { useRef, useEffect, useState } from 'react';
import handDetection from './handDetection';

const StepByStepCameraFeed = ({ onMoveDetected, theme }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [handDetectionEnabled, setHandDetectionEnabled] = useState(false);
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

  // Draw hand landmarks on canvas
  const drawHand = (landmarks, boundingBox) => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw semi-transparent overlay to make landmarks more visible
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw bounding box
    if (boundingBox) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3;
      
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
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#FF0000';
      ctx.fill();
      
      // Add a white border to make points more visible
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Connect points with lines
      if (i > 0 && i % 4 !== 0) {
        const [prevX, prevY] = landmarks[i - 1];
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    
    // Draw move text with better visibility
    const move = detectedMove;
    ctx.font = 'bold 28px Arial';
    
    // Draw text shadow for better visibility
    ctx.fillStyle = '#000000';
    ctx.fillText(`Move: ${move}`, 12, 32);
    
    // Draw text
    ctx.fillStyle = '#00FF00';
    ctx.fillText(`Move: ${move}`, 10, 30);
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
          
          {/* Status indicators */}
          <div className="camera-controls" style={{ transform: 'scaleX(-1)' }}>
            {cameraReady && (
              <div className="camera-status">
                Camera is working! {videoRef.current?.videoWidth}x{videoRef.current?.videoHeight}
              </div>
            )}
            
            {cameraReady && !handDetectionEnabled && (
              <button 
                className="enable-detection-btn"
                onClick={() => setHandDetectionEnabled(true)}
              >
                Enable Hand Detection
              </button>
            )}
            
            {handDetectionEnabled && handDetectionReady && (
              <div className="detection-status">
                Hand detection active. Detected move: {detectedMove}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepByStepCameraFeed;
