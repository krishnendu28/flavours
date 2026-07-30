import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../utils/api';

export default function useOrderBuzzer() {
  const { on } = useSocket();
  const [alertOrder, setAlertOrder] = useState(null);
  const audioRef = useRef(null);
  const alertRef = useRef(null);

  useEffect(() => { alertRef.current = alertOrder; }, [alertOrder]);

  const playBuzzer = useCallback(() => {
    try {
      if (!audioRef.current) {
        const sampleRate = 8000;
        const duration = 2;
        const freq = 880;
        const length = sampleRate * duration;
        const buffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(buffer);
        const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeStr(36, 'data');
        view.setUint32(40, length * 2, true);
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const envelope = Math.max(0, 1 - t / duration);
          const sample = Math.sin(2 * Math.PI * freq * t) * 0.3 * envelope;
          const val = Math.max(-1, Math.min(1, sample));
          view.setInt16(44 + i * 2, val * 32767, true);
        }
        const blob = new Blob([buffer], { type: 'audio/wav' });
        audioRef.current = new Audio(URL.createObjectURL(blob));
        audioRef.current.loop = true;
        audioRef.current.volume = 0.8;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch (e) {
      console.warn('Buzzer error', e);
    }
  }, []);

  const stopBuzzer = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const unsub1 = on('new-order', (order) => {
      if (order.status === 'pending') {
        setAlertOrder(order);
        playBuzzer();
      }
    });
    const unsub2 = on('order-alert', (order) => {
      if (order.source === 'pos') return;
      setAlertOrder(order);
      playBuzzer();
    });
    const unsub3 = on('order-updated', (updated) => {
      const current = alertRef.current;
      if (current && current.id === updated.id) {
        setAlertOrder(null);
        stopBuzzer();
      }
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [on, playBuzzer, stopBuzzer]);

  const handleAccept = async (orderId) => {
    try {
      await api.updateOrderStatus(orderId, 'accepted');
      setAlertOrder(null);
      stopBuzzer();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDismissAlert = () => {
    setAlertOrder(null);
    stopBuzzer();
  };

  return { alertOrder, handleAccept, handleDismissAlert };
}
