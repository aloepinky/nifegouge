import { useEffect } from 'react';

// A menu that closes the way a menu should: on a click anywhere outside `wrap`, and on Escape,
// after which focus returns to `trigger` so the keyboard does not lose its place. The top bar's
// dropdowns and the syllabus picker both use it.
export default function useMenuDismiss(open, setOpen, wrap, trigger) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      if (trigger.current) trigger.current.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen, wrap, trigger]);
}
