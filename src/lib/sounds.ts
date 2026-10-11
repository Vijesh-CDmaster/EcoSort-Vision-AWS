"use client";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playSuccessSound() {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === 'suspended') {
    context.resume();
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.15, context.currentTime + 0.01);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(600, context.currentTime);

  oscillator.start(context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.2);
  oscillator.stop(context.currentTime + 0.2);
}
