import React, { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { OrderEntryPanel } from "./OrderEntryPanel";

export const OrderEntryModal: React.FC = () => {
  const isOrderModalOpen = useAppStore((state) => state.isOrderModalOpen);
  const closeOrderModal = useAppStore((state) => state.closeOrderModal);
  const activeTicker = useAppStore((state) => state.activeTicker);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOrderModalOpen) {
        closeOrderModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOrderModalOpen, closeOrderModal]);

  if (!isOrderModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeOrderModal}
    >
      <div
        className="relative w-full max-w-lg bg-[#111C30] border border-[#26354B] rounded-xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <OrderEntryPanel ticker={activeTicker || "RELIANCE"} onClose={closeOrderModal} />
      </div>
    </div>
  );
};

