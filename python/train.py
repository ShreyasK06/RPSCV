import cv2
import mediapipe as mp


mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=False, max_num_hands=1, min_detection_confidence=0.5)
mp_drawing = mp.solutions.drawing_utils
margin_s = 0.075
margin_p = 0.1


cap = cv2.VideoCapture(0)

def detectMoves(hl):
    rock = hl[6].y > hl[4].y
    scissor = abs(hl[4].x - hl[16].x) < margin_s and abs(hl[4].x - hl[20].x) < margin_s and abs(hl[16].x - hl[20].x) < margin_s
    paper = abs(hl[6].y - hl[10].y) < margin_p and abs(hl[6].y - hl[14].y) < margin_p and abs(hl[6].y - hl[19].y) < margin_p and abs(hl[10].y - hl[14].y) < margin_p and abs(hl[10].y - hl[19].y) < margin_p and abs(hl[14].y - hl[19].y) < margin_p and hl[4].y < hl[5].y + margin_s and hl[4].y > hl[6].y + margin_s
    
    
    if(rock):
        return "Rock"
    if(scissor):
        return "Scissor"
    if(paper):
        return "Paper"
    return "None"
    

while True:
    ret, frame = cap.read()
    if not ret:
        break


    frame = cv2.flip(frame, 1)
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)


    results = hands.process(frame_rgb)


    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            move = detectMoves(hand_landmarks.landmark)
            cv2.putText(frame, move, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)


    cv2.imshow('Hand Detection', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break


cap.release()
cv2.destroyAllWindows()