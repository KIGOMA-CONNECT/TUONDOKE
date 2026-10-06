import React, { ReactNode, useEffect, useRef, useState } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  peek?: number;
  maxHeight?: string | number;
  header?: ReactNode;
}

export function BottomSheet({ open, onClose, children, peek = 240, maxHeight = '90vh', header }: BottomSheetProps) {
  const [height, setHeight] = useState(open ? peek : 0);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(peek);

  useEffect(() => {
    if (open) setHeight(peek);
    else setHeight(0);
  }, [open, peek]);

  const onTouchStart = (e: React.TouchEvent) => {
    dragging.current = true;
    startY.current = e.touches[0].clientY;
    startH.current = height;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const delta = startY.current - e.touches[0].clientY;
    let nh = startH.current + delta;
    if (nh > (typeof maxHeight === 'number' ? maxHeight : window.innerHeight * 0.9)) nh = typeof maxHeight === 'number' ? maxHeight : window.innerHeight * 0.9;
    if (nh < 56) nh = 0;
    setHeight(nh);
  };
  const onTouchEnd = () => {
    dragging.current = false;
    if (height < peek / 2) {
      setHeight(0);
      onClose();
    } else if (height < peek) {
      setHeight(peek);
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    let nh = startH.current + delta;
    const mh = typeof maxHeight === 'number' ? maxHeight : Math.min(window.innerHeight * 0.9, window.innerHeight);
    if (nh > mh) nh = mh;
    if (nh < 0) nh = 0;
    setHeight(nh);
  };
  const onMouseUp = () => {
    dragging.current = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    if (height < peek / 2) { setHeight(0); onClose(); }
    else if (height < peek * 1.2) setHeight(peek);
  };

  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 900 }} />}
      <div style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        height,
        maxHeight,
        background: '#fff',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        transition: dragging.current ? 'none' : 'height 0.25s ease',
        overflow: 'hidden',
        zIndex: 1000,
        display: 'flex', flexDirection: 'column',
      }}>
        <div
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          style={{ padding: 12, cursor: 'grab', userSelect: 'none', flexShrink: 0 }}
        >
          <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 4, margin: '0 auto' }} />
        </div>
        {header && <div style={{ padding: '0 16px 8px', flexShrink: 0 }}>{header}</div>}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 16px' }}>
          {children}
        </div>
      </div>
    </>
  );
}
