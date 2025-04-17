import React, { useRef, useEffect, useState } from 'react';
import handDetection from './handDetection';

const StepByStepCameraFeed = ({ onMoveDetected, theme }) => {
  const videoRef = useRef(null);
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

        // Get video track settings for debugging
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        console.log('Video track settings:', settings);

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

          // We're not drawing anything on the canvas anymore
          // Just using the detected move for the text indicator
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

  // We don't need a drawHand function anymore, but keeping an empty one
  // to avoid changing the callback structure
  const drawHand = () => { };

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

          {/* We've removed the canvas since we're not drawing anything */}

          {/* Simple text indicator above the camera */}
          {handDetectionEnabled && handDetectionReady && detectedMove !== "NONE" && (
            <div className="text-move-indicator">
              <div className={`move-text ${detectedMove.toLowerCase()}`}>
                {detectedMove}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StepByStepCameraFeed;
