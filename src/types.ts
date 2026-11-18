/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserAudience = 'mahasiswa' | 'peneliti' | 'desainer' | 'kreatif';

export type NodeCategory =
  | 'core'
  | 'hypothesis'
  | 'concept'
  | 'evidence'
  | 'action'
  | 'question'
  | 'insight'
  | 'resource';

export interface MindNode {
  id: string;
  label: string;
  category: NodeCategory;
  description?: string;
  x: number;
  y: number;
  z: number;
  color: string;
  tags?: string[];
  audience?: UserAudience;
  expanded?: boolean;
}

export interface MindLink {
  id: string;
  source: string;
  target: string;
  label?: string;
  relationship?: 'supports' | 'causes' | 'leads_to' | 'contrasts' | 'subconcept';
  color?: string;
  strength?: number;
}

export interface MindMapData {
  title: string;
  audience: UserAudience;
  description: string;
  nodes: MindNode[];
  links: MindLink[];
}

export type HandGestureType =
  | 'none'
  | 'pinch'       // Grab / Move node
  | 'point'       // Laser pointer select
  | 'open_palm'   // Pan/Rotate world
  | 'peace'       // Create new node at ray
  | 'fist'        // Pull towards camera
  | 'thumbs_up'   // Zoom In
  | 'thumbs_down';// Zoom Out

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface SingleHandData {
  handType: 'left' | 'right';
  landmarks: HandLandmark[];
  gesture: HandGestureType;
  pinchDistance: number;
  pointerPos: { x: number; y: number }; // normalized -1 to 1 for Three.js
  isPinching: boolean;
  confidence: number;
}

export type DualHandInteraction =
  | 'none'
  | 'two_hand_pinch_zoom'   // Dual pinch to scale space or camera zoom
  | 'two_hand_rotate'       // Dual hand steering wheel rotation
  | 'two_hand_connect'      // Left hand pinches Node A, Right hand pinches Node B to link!
  | 'two_hand_pan';         // Both palms open to pan world

export interface HandTrackingState {
  detected: boolean;
  handType: 'left' | 'right' | 'both';
  handsCount: number;
  hands: SingleHandData[];
  leftHand?: SingleHandData;
  rightHand?: SingleHandData;
  dualHandInteraction: DualHandInteraction;
  dualHandDistance?: number;
  dualHandAngle?: number; // radians angle between two hands for screen rotation
  // Primary active hand fields for simple backwards compatibility:
  landmarks: HandLandmark[];
  gesture: HandGestureType;
  pinchDistance: number;
  pointerPos: { x: number; y: number };
  isPinching: boolean;
  confidence: number;
}

export type LayoutMode = 'free' | 'force3d' | 'radial' | 'tree' | 'helix';
