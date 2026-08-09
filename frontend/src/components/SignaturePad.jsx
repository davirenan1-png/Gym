import { useRef, useState, useImperativeHandle, forwardRef } from 'react';

export const SignaturePad = forwardRef(function SignaturePad(_props, ref) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useImperativeHandle(ref, () => ({
    isEmpty: () => !hasDrawn,
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    },
    toDataURL: () => canvasRef.current.toDataURL('image/png'),
  }));

  function pointerPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e) {
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onPointerMove(e) {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#e7edf5';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasDrawn(true);
  }

  function onPointerUp() {
    drawing.current = false;
  }

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={180}
      className="signature-pad"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  );
});
