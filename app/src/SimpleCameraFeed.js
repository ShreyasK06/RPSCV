import React, { useRef, useEffect, useState } from 'react';

const SimpleCameraFeed = ({ theme }) => {
  const videoRef = useRef(null);
  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

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
          {cameraReady && (
            <div className="camera-status" style={{ transform: 'scaleX(-1)' }}>
              Camera is working! {videoRef.current?.videoWidth}x{videoRef.current?.videoHeight}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleCameraFeed;
