import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import SupportCenterPage from './SupportCenterPage';

export default function SupportCenterModal({ isOpen, onClose, theme }: { isOpen: boolean, onClose: () => void, theme: 'light' | 'dark' }) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]" />
        <Dialog.Content className="fixed inset-0 rounded-t-[32px] bg-[#07090E] z-[70] overflow-hidden focus:outline-none border-t border-white/10">
          <SupportCenterPage theme={theme} onBack={onClose} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
