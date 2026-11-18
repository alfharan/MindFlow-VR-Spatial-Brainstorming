/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  HandGestureType,
  HandLandmark,
  HandTrackingState,
  SingleHandData,
  DualHandInteraction,
} from '../types';

declare global {
  interface Window {
    Hands?: any;
    Camera?: any;
  }
}

const MEDIAPIPE_VERSION = '0.4.1675469240';

// Global tab-wide singleton to strictly prevent multiple WASM initializations in Emscripten MEMFS
function getGlobalHandsSingleton(): any {
  return typeof window !== 'undefined' ? (window as any).__mindflow_hands_singleton : null;
}
function setGlobalHandsSingleton(inst: any) {
  if (typeof window !== 'undefined') {
    (window as any).__mindflow_hands_singleton = inst;
  }
}

export class HandTrackingService {
  private hands: any = null;
  private isTracking: boolean = false;
  private isProcessingFrame: boolean = false;
  private animFrameId: number | null = null;
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private onStateUpdate?: (state: HandTrackingState) => void;
  private lastProcessTime: number = 0;
  private initPromise: Promise<any> | null = null;

  // Initialize or retrieve the singleton MediaPipe Hands instance configured for up to 2 hands
  private async getOrCreateHands(): Promise<any> {
    const existing = getGlobalHandsSingleton();
    if (existing) {
      this.hands = existing;
      return existing;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      // Wait up to 5 seconds for CDN script to be available on window
      let attempts = 0;
      while (typeof window.Hands === 'undefined' && attempts < 50) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
      }

      if (typeof window.Hands === 'undefined') {
        throw new Error('Script MediaPipe Hands belum termuat dari CDN.');
      }

      // Check again if another call created the singleton while waiting
      const current = getGlobalHandsSingleton();
      if (current) {
        return current;
      }

      try {
        const hands = new window.Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_VERSION}/${file}`;
          },
        });

        // Set maxNumHands to 2 to enable simultaneous two-hand tracking
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 0, // 0 = Lite model: fastest, stable memory footprint, avoids SIMD aborts
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });

        // Initialize wasm before any send() calls
        if (typeof hands.initialize === 'function') {
          await hands.initialize();
        }

        setGlobalHandsSingleton(hands);
        return hands;
      } catch (err: any) {
        console.warn('MediaPipe Hands initialization note:', err);
        const fallback = getGlobalHandsSingleton();
        if (fallback) {
          return fallback;
        }
        throw err;
      }
    })();

    const result = await this.initPromise;
    this.hands = result;
    return result;
  }

  // Start webcam tracking
  public async startWebcam(
    videoEl: HTMLVideoElement,
    onState: (state: HandTrackingState) => void,
    onError?: (err: Error) => void
  ): Promise<boolean> {
    this.videoElement = videoEl;
    this.onStateUpdate = onState;

    try {
      // 1. Get or initialize MediaPipe Hands singleton
      this.hands = await this.getOrCreateHands();
      if (!this.hands) {
        throw new Error('Gagal menginisialisasi modul MediaPipe Hands');
      }

      // Bind results callback to this service
      this.hands.onResults((results: any) => {
        this.processResults(results);
      });

      // 2. Request user webcam stream directly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      this.mediaStream = stream;
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');

      // Ensure video is playing and has valid dimensions before feeding to MediaPipe
      try {
        await videoEl.play();
      } catch (playErr) {
        console.warn('Video play note:', playErr);
      }

      await new Promise<void>((resolve) => {
        if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
          resolve();
        } else {
          const onLoaded = () => {
            videoEl.removeEventListener('loadeddata', onLoaded);
            resolve();
          };
          videoEl.addEventListener('loadeddata', onLoaded);
          setTimeout(resolve, 800);
        }
      });

      this.isTracking = true;
      this.isProcessingFrame = false;
      this.lastProcessTime = 0;

      // 3. Start safe, non-reentrant frame processing loop
      const frameLoop = async () => {
        if (!this.isTracking) return;

        const now = performance.now();
        // Pace at ~25 FPS (every 40ms) to ensure WASM inference finishes before next frame
        if (now - this.lastProcessTime >= 40 && !this.isProcessingFrame) {
          if (
            this.videoElement &&
            !this.videoElement.paused &&
            !this.videoElement.ended &&
            this.videoElement.readyState >= 2 &&
            this.videoElement.videoWidth > 0 &&
            this.videoElement.videoHeight > 0 &&
            this.hands &&
            this.isTracking
          ) {
            this.isProcessingFrame = true;
            this.lastProcessTime = now;
            try {
              await this.hands.send({ image: this.videoElement });
            } catch (frameErr: any) {
              const msg = String(frameErr?.message || frameErr);
              console.warn('Frame dropped in MediaPipe processing:', msg);
              if (msg.includes('abort') || msg.includes('File exists')) {
                this.stop();
                return;
              }
            } finally {
              this.isProcessingFrame = false;
            }
          }
        }

        if (this.isTracking) {
          this.animFrameId = requestAnimationFrame(frameLoop);
        }
      };

      this.animFrameId = requestAnimationFrame(frameLoop);
      return true;
    } catch (err: any) {
      console.warn('Webcam/MediaPipe initialization failed:', err);
      this.stop();
      onError?.(err);
      return false;
    }
  }

  private processResults(results: any) {
    if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.onStateUpdate?.({
        detected: false,
        handType: 'right',
        handsCount: 0,
        hands: [],
        dualHandInteraction: 'none',
        landmarks: [],
        gesture: 'none',
        pinchDistance: 1,
        pointerPos: { x: 0, y: 0 },
        isPinching: false,
        confidence: 0,
      });
      return;
    }

    const processedHands: SingleHandData[] = [];

    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const landmarks: HandLandmark[] = results.multiHandLandmarks[i];
      // MediaPipe label: 'Left' or 'Right'. In mirrored selfie view: 'Left' is user's physical right or left
      const rawLabel = results.multiHandedness?.[i]?.label || (i === 0 ? 'Right' : 'Left');
      const handType: 'left' | 'right' = rawLabel.toLowerCase() === 'left' ? 'left' : 'right';

      // 1. Calculate Pinch (Thumb Tip #4 to Index Tip #8)
      const thumb = landmarks[4];
      const index = landmarks[8];
      const wrist = landmarks[0];

      const dx = thumb.x - index.x;
      const dy = thumb.y - index.y;
      const dz = thumb.z - index.z;
      const pinchDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const isPinching = pinchDistance < 0.085;

      // 2. Gesture classification
      const isIndexExtended = this.isExtended(landmarks, 8, 6, wrist);
      const isMiddleExtended = this.isExtended(landmarks, 12, 10, wrist);
      const isRingExtended = this.isExtended(landmarks, 16, 14, wrist);
      const isPinkyExtended = this.isExtended(landmarks, 20, 18, wrist);
      const allFourCurled = !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended;
      const thumbTip = landmarks[4];
      const thumbMcp = landmarks[2];

      let gesture: HandGestureType = 'none';

      if (isPinching) {
        gesture = 'pinch';
      } else if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        gesture = 'peace'; // ✌️ Peace sign -> Spawn Node
      } else if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        gesture = 'point'; // ☝️ Pointing laser
      } else if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
        gesture = 'open_palm'; // 🖐️ Pan/Rotate
      } else if (allFourCurled) {
        // Check Thumb orientation: in screen coordinates, y=0 is top, y=1 is bottom
        if (thumbTip.y < thumbMcp.y - 0.06 && thumbTip.y < wrist.y - 0.08) {
          gesture = 'thumbs_up'; // 👍 Zoom In
        } else if (thumbTip.y > thumbMcp.y + 0.06 && thumbTip.y > wrist.y + 0.05) {
          gesture = 'thumbs_down'; // 👎 Zoom Out
        } else {
          gesture = 'fist'; // ✊ Fist
        }
      }

      // 3. Normalized pointer coordinates for Three.js (-1 to +1, mirrored horizontally)
      const pointerPos = {
        x: (1 - index.x) * 2 - 1,
        y: -(index.y * 2 - 1),
      };

      processedHands.push({
        handType,
        landmarks,
        gesture,
        pinchDistance,
        pointerPos,
        isPinching,
        confidence: results.multiHandedness?.[i]?.score || 0.9,
      });
    }

    // Determine dual hand interaction if 2 hands are visible
    let dualHandInteraction: DualHandInteraction = 'none';
    let dualHandDistance: number | undefined;
    let dualHandAngle: number | undefined;

    let leftHand = processedHands.find((h) => h.handType === 'left');
    let rightHand = processedHands.find((h) => h.handType === 'right');

    if (processedHands.length >= 2) {
      if (!leftHand && processedHands[0]) leftHand = processedHands[0];
      if (!rightHand && processedHands[1]) rightHand = processedHands[1];

      if (leftHand && rightHand) {
        // Distance between Left index tip and Right index tip
        const lIndex = leftHand.landmarks[8];
        const rIndex = rightHand.landmarks[8];
        const dist = Math.sqrt(
          Math.pow(lIndex.x - rIndex.x, 2) +
          Math.pow(lIndex.y - rIndex.y, 2) +
          Math.pow(lIndex.z - rIndex.z, 2)
        );
        dualHandDistance = dist;

        // Angle between hands for steering wheel screen rotation
        const lWrist = leftHand.landmarks[0];
        const rWrist = rightHand.landmarks[0];
        // Mirror compensation: angle in radians
        const angle = Math.atan2((1 - rWrist.y) - (1 - lWrist.y), (1 - rWrist.x) - (1 - lWrist.x));
        dualHandAngle = angle;

        if (leftHand.isPinching && rightHand.isPinching) {
          dualHandInteraction = 'two_hand_pinch_zoom';
        } else if (Math.abs(rWrist.y - lWrist.y) > 0.12 && !leftHand.isPinching && !rightHand.isPinching) {
          // Steering wheel gesture: one hand higher than the other -> rotate screen!
          dualHandInteraction = 'two_hand_rotate';
        } else if (leftHand.gesture === 'open_palm' && rightHand.gesture === 'open_palm') {
          dualHandInteraction = 'two_hand_pan';
        }
      }
    }

    // Primary hand fallback (prefer right hand, or first detected)
    const primaryHand = rightHand || processedHands[0];

    this.onStateUpdate?.({
      detected: true,
      handType: processedHands.length > 1 ? 'both' : primaryHand.handType,
      handsCount: processedHands.length,
      hands: processedHands,
      leftHand,
      rightHand,
      dualHandInteraction,
      dualHandDistance,
      dualHandAngle,
      // Backwards-compatible primary fields:
      landmarks: primaryHand.landmarks,
      gesture: primaryHand.gesture,
      pinchDistance: primaryHand.pinchDistance,
      pointerPos: primaryHand.pointerPos,
      isPinching: primaryHand.isPinching,
      confidence: primaryHand.confidence,
    });
  }

  private isExtended(
    lms: HandLandmark[],
    tipIdx: number,
    pipIdx: number,
    wrist: HandLandmark
  ): boolean {
    const tipDist = this.distSq(lms[tipIdx], wrist);
    const pipDist = this.distSq(lms[pipIdx], wrist);
    return tipDist > pipDist * 1.15;
  }

  private distSq(p1: HandLandmark, p2: HandLandmark) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy;
  }

  public stop() {
    this.isTracking = false;
    this.isProcessingFrame = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.onStateUpdate?.({
      detected: false,
      handType: 'right',
      handsCount: 0,
      hands: [],
      dualHandInteraction: 'none',
      landmarks: [],
      gesture: 'none',
      pinchDistance: 1,
      pointerPos: { x: 0, y: 0 },
      isPinching: false,
      confidence: 0,
    });
  }
}

export const handTracker = new HandTrackingService();
