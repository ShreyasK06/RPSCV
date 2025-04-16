import cv2
import numpy as np
from flask import Flask, Response, jsonify
from flask_cors import CORS
import mediapipe as mp

app = Flask(__name__)
CORS(app)

mp_hands = mp.solutions.hands

try:
    hands = mp_hands.Hands(static_image_mode=False, max_num_hands=1, min_detection_confidence=0.5)
    print("MediaPipe Hands initialized successfully")
except Exception as e:
    print(f"Error initializing MediaPipe Hands: {e}")
    hands = None

mp_drawing = mp.solutions.drawing_utils
moves = "none"
margin_s = 0.075
margin_p = 0.1

try:
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Warning: Could not open camera. Will use fallback.")
    else:
        print("Camera initialized successfully. Status:", cap.isOpened())
except Exception as e:
    print(f"Error initializing camera: {e}")
    cap = None

def detectMoves(hl):
    rock = hl[6].y > hl[4].y
    scissor = abs(hl[4].x - hl[16].x) < margin_s and abs(hl[4].x - hl[20].x) < margin_s and abs(hl[16].x - hl[20].x) < margin_s
    paper = abs(hl[6].y - hl[10].y) < margin_p and abs(hl[6].y - hl[14].y) < margin_p and abs(hl[6].y - hl[19].y) < margin_p and abs(hl[10].y - hl[14].y) < margin_p and abs(hl[10].y - hl[19].y) < margin_p and abs(hl[14].y - hl[19].y) < margin_p and hl[4].y < hl[5].y + margin_s and hl[4].y > hl[6].y + margin_s


    if(rock):
        return "ROCK"
    if(scissor):
        return "SCISSOR"
    if(paper):
        return "PAPER"
    return "NONE"

def gen_frames():
    while True:
        try:
            # Check if camera is available
            if cap is None or not cap.isOpened():
                print("Camera not available")
                # Return a blank frame if camera is not available
                blank_frame = np.zeros((480, 640, 3), np.uint8)
                cv2.putText(blank_frame, "Camera Not Available", (150, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                ret, buffer = cv2.imencode('.jpg', blank_frame)
                frame = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
                # Sleep to avoid flooding with frames
                import time
                time.sleep(1)
                continue

            ret, frame = cap.read()
            if not ret:
                print("Failed to grab frame from camera")
                # Return a blank frame if camera read fails
                blank_frame = np.zeros((480, 640, 3), np.uint8)
                cv2.putText(blank_frame, "Camera Error", (200, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                ret, buffer = cv2.imencode('.jpg', blank_frame)
                frame = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
                continue

            frame = cv2.flip(frame, 1)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            try:
                # Check if hands is available
                if hands is None:
                    cv2.putText(frame, "Hand detection not available", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2, cv2.LINE_AA)
                    move = "NONE"
                    setMove(move)
                else:
                    results = hands.process(frame_rgb)
                    move = "NONE"
                    setMove(move)

                    if results and results.multi_hand_landmarks:
                        for hand_landmarks in results.multi_hand_landmarks:
                            # mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                            move = detectMoves(hand_landmarks.landmark)
                            setMove(move)
                            # Draw a rectangle around the hand
                            h, w, _ = frame.shape  # _ for unused channel dimension
                            x_min, y_min = w, h
                            x_max, y_max = 0, 0
                            for landmark in hand_landmarks.landmark:
                                x, y = int(landmark.x * w), int(landmark.y * h)
                                x_min = min(x_min, x)
                                y_min = min(y_min, y)
                                x_max = max(x_max, x)
                                y_max = max(y_max, y)
                            cv2.rectangle(frame, (x_min-20, y_min-20), (x_max+20, y_max+20), (0, 255, 0), 2)
            except Exception as e:
                print(f"Error processing hand detection: {e}")
                # Continue without hand detection
                pass

            # Add text to show the current move
            cv2.putText(frame, f"Move: {getMove()}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)

            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        except Exception as e:
            print(f"Error in gen_frames: {e}")
            # Return an error frame
            blank_frame = np.zeros((480, 640, 3), np.uint8)
            cv2.putText(blank_frame, "Stream Error", (200, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            ret, buffer = cv2.imencode('.jpg', blank_frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


def getMove():
    return moves

def setMove(move):
    global moves
    moves = move

@app.route('/video_feed')
def video_feed():
    print("Video feed requested")
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/get_move', methods=['GET'])
def get_move():
    return jsonify({'move': moves})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)